"""API Flask principale pour Zürich."""

from __future__ import annotations

import logging
import os
import sqlite3
import threading
from collections import defaultdict
from typing import Any

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from database import (
    DB_PATH,
    count_articles,
    get_alerts,
    get_article_by_id,
    get_articles,
    get_last_scrape_time,
    get_stats,
    init_db,
)
from scheduler import start_scheduler
from scraper import scrape_all

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
LOGGER = logging.getLogger(__name__)

ALLOWED_REGIONS = {"world", "africa", "asia", "americas", "europe", "oceania"}
ALLOWED_THEMES = {"waste", "air", "water", "soil"}

app = Flask(__name__)
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173",
).split(",")
CORS(app, origins=ALLOWED_ORIGINS)

_SCHEDULER_STARTED = False


def _ensure_initialized() -> None:
    """Initialise DB + scheduler une seule fois par process."""
    global _SCHEDULER_STARTED
    init_db()
    if not _SCHEDULER_STARTED:
        start_scheduler()
        _SCHEDULER_STARTED = True


def regression_lineaire(x, y):
    n = len(x)
    if n < 2:
        return 0.0, 0.0, 0.0
    x, y = np.array(x, dtype=float), np.array(y, dtype=float)
    slope = (n * np.sum(x * y) - np.sum(x) * np.sum(y)) / (
        n * np.sum(x**2) - np.sum(x) ** 2 + 1e-10
    )
    intercept = np.mean(y) - slope * np.mean(x)
    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2) + 1e-10
    r2 = 1 - ss_res / ss_tot
    return round(float(slope), 4), round(float(intercept), 4), round(float(r2), 4)


def kmeans(data, k=3, iterations=50):
    data = np.array(data, dtype=float)
    if len(data) == 0:
        return [], []
    k = max(1, min(int(k), len(data)))
    idx = np.random.choice(len(data), k, replace=False)
    centroids = data[idx].copy()
    labels = np.zeros(len(data), dtype=int)
    for _ in range(iterations):
        for i, point in enumerate(data):
            dists = [np.linalg.norm(point - c) for c in centroids]
            labels[i] = int(np.argmin(dists))
        for j in range(k):
            mask = labels == j
            if mask.any():
                centroids[j] = data[mask].mean(axis=0)
    return labels.tolist(), centroids.tolist()


def pca_2d(data):
    data = np.array(data, dtype=float)
    if data.size == 0:
        return [], [0.0, 0.0]
    data -= data.mean(axis=0)
    cov = np.cov(data.T)
    if np.ndim(cov) < 2:
        projected = data[:, :2] if data.shape[1] >= 2 else np.column_stack([data[:, 0], np.zeros(len(data))])
        return projected.tolist(), [100.0, 0.0]
    vals, vecs = np.linalg.eigh(cov)
    idx = np.argsort(vals)[::-1]
    vecs = vecs[:, idx]
    projected = data @ vecs[:, :2]
    var_total = vals.sum() + 1e-10
    first = vals[idx[0]] / var_total * 100 if len(vals) > 0 else 0.0
    second = vals[idx[1]] / var_total * 100 if len(vals) > 1 else 0.0
    variance = [round(float(first), 1), round(float(second), 1)]
    return projected.tolist(), variance


def _safe_round(value: float, digits: int = 4) -> float:
    return round(float(value), digits)


def _fetch_stats_rows() -> list[dict[str, Any]]:
    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, region, source, theme, niveau, pays
            FROM articles
            WHERE TRIM(COALESCE(region, '')) <> ''
            """
        ).fetchall()
    return [dict(row) for row in rows]


def _pollution_from_levels(level_counts: dict[str, int]) -> float:
    weights = {"critique": 100.0, "eleve": 72.0, "modere": 45.0, "info": 18.0}
    total = sum(level_counts.values())
    if total == 0:
        return 0.0
    score = sum(level_counts.get(level, 0) * weight for level, weight in weights.items()) / total
    return _safe_round(score, 2)


def _build_regional_dataset(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "region": "",
            "articles_critique": 0,
            "articles_eleve": 0,
            "articles_modere": 0,
            "articles_info": 0,
            "nb_articles": 0,
            "sources": set(),
            "indice_pollution": 0.0,
        }
    )
    for row in rows:
        region = (row.get("region") or "world").strip().lower()
        niveau = (row.get("niveau") or "info").strip().lower()
        source = (row.get("source") or "inconnue").strip()
        if not region:
            region = "world"

        item = grouped[region]
        item["region"] = region
        item["nb_articles"] += 1
        item["sources"].add(source)
        if niveau == "critique":
            item["articles_critique"] += 1
        elif niveau == "eleve":
            item["articles_eleve"] += 1
        elif niveau == "modere":
            item["articles_modere"] += 1
        else:
            item["articles_info"] += 1

    regions = []
    for region_data in grouped.values():
        level_counts = {
            "critique": region_data["articles_critique"],
            "eleve": region_data["articles_eleve"],
            "modere": region_data["articles_modere"],
            "info": region_data["articles_info"],
        }
        region_data["nb_sources"] = len(region_data["sources"])
        region_data["indice_pollution"] = _pollution_from_levels(level_counts)
        del region_data["sources"]
        regions.append(region_data)

    regions.sort(key=lambda item: item["region"])
    return regions


def _multiple_regression(features: np.ndarray, target: np.ndarray):
    if len(features) == 0:
        return np.array([]), np.zeros(4), 0.0, 0.0
    x_aug = np.column_stack([np.ones(len(features)), features])
    beta, *_ = np.linalg.lstsq(x_aug, target, rcond=None)
    pred = x_aug @ beta
    ss_res = np.sum((target - pred) ** 2)
    ss_tot = np.sum((target - np.mean(target)) ** 2) + 1e-10
    r2 = 1 - ss_res / ss_tot
    intercept = float(beta[0]) if len(beta) else 0.0
    coefficients = beta[1:] if len(beta) > 1 else np.zeros(features.shape[1] if features.ndim > 1 else 0)
    return pred, coefficients, intercept, _safe_round(r2, 4)


def _silhouette_score(data: np.ndarray, labels: np.ndarray) -> float:
    if len(data) < 2:
        return 0.0
    unique_labels = np.unique(labels)
    if len(unique_labels) < 2:
        return 0.0

    silhouettes = []
    for i, point in enumerate(data):
        current_label = labels[i]
        same_cluster = data[labels == current_label]
        if len(same_cluster) <= 1:
            a = 0.0
        else:
            a = float(np.mean([np.linalg.norm(point - other) for other in same_cluster if not np.array_equal(other, point)]))

        b = float("inf")
        for label in unique_labels:
            if label == current_label:
                continue
            other_cluster = data[labels == label]
            if len(other_cluster) == 0:
                continue
            dist = float(np.mean([np.linalg.norm(point - other) for other in other_cluster]))
            b = min(b, dist)

        if b == float("inf"):
            s = 0.0
        else:
            denominator = max(a, b)
            s = 0.0 if denominator == 0 else (b - a) / denominator
        silhouettes.append(s)

    return _safe_round(float(np.mean(silhouettes)), 4)


def _knn_classification(rows: list[dict[str, Any]]) -> dict[str, Any]:
    classes = ["critique", "eleve", "modere", "info"]
    class_to_idx = {label: idx for idx, label in enumerate(classes)}
    if not rows:
        return {
            "methode": "K-Nearest Neighbors (k=3)",
            "classes": classes,
            "matrice_confusion": [[0, 0, 0, 0] for _ in classes],
            "accuracy": 0.0,
            "rapport": [
                {"classe": label, "precision": 0.0, "rappel": 0.0, "f1": 0.0}
                for label in classes
            ],
        }

    regions = sorted({(row.get("region") or "world").strip().lower() for row in rows})
    themes = sorted({(row.get("theme") or "waste").strip().lower() for row in rows})
    region_to_idx = {region: idx for idx, region in enumerate(regions)}
    theme_to_idx = {theme: idx for idx, theme in enumerate(themes)}

    feature_size = len(regions) + len(themes)
    x_data = []
    y_data = []
    for row in rows:
        niveau = (row.get("niveau") or "info").strip().lower()
        if niveau not in class_to_idx:
            niveau = "info"
        region = (row.get("region") or "world").strip().lower()
        theme = (row.get("theme") or "waste").strip().lower()
        vector = np.zeros(feature_size, dtype=float)
        vector[region_to_idx.get(region, 0)] = 1.0
        vector[len(regions) + theme_to_idx.get(theme, 0)] = 1.0
        x_data.append(vector)
        y_data.append(class_to_idx[niveau])

    x_data = np.array(x_data, dtype=float)
    y_data = np.array(y_data, dtype=int)

    if len(x_data) < 2:
        confusion = np.zeros((4, 4), dtype=int)
        for idx in y_data:
            confusion[idx, idx] += 1
        return {
            "methode": "K-Nearest Neighbors (k=3)",
            "classes": classes,
            "matrice_confusion": confusion.tolist(),
            "accuracy": 1.0 if len(y_data) else 0.0,
            "rapport": [
                {"classe": label, "precision": 1.0 if confusion[i, i] else 0.0, "rappel": 1.0 if confusion[i, i] else 0.0, "f1": 1.0 if confusion[i, i] else 0.0}
                for i, label in enumerate(classes)
            ],
        }

    rng = np.random.default_rng(42)
    indices = np.arange(len(x_data))
    rng.shuffle(indices)
    split_at = max(1, int(len(indices) * 0.7))
    train_idx = indices[:split_at]
    test_idx = indices[split_at:] if split_at < len(indices) else indices[-1:]
    if len(train_idx) == 0:
        train_idx = indices[:-1]
        test_idx = indices[-1:]

    x_train, y_train = x_data[train_idx], y_data[train_idx]
    x_test, y_test = x_data[test_idx], y_data[test_idx]

    predictions = []
    for point in x_test:
        dists = np.linalg.norm(x_train - point, axis=1)
        k = min(3, len(dists))
        nearest = np.argsort(dists)[:k]
        nearest_labels = y_train[nearest]
        votes = np.bincount(nearest_labels, minlength=len(classes))
        winners = np.flatnonzero(votes == votes.max())
        if len(winners) == 1:
            pred = int(winners[0])
        else:
            best_label = int(winners[0])
            best_dist = float("inf")
            for candidate in winners:
                candidate_dists = [dists[idx] for idx, label in zip(nearest, nearest_labels) if label == candidate]
                avg_dist = float(np.mean(candidate_dists)) if candidate_dists else float("inf")
                if avg_dist < best_dist:
                    best_dist = avg_dist
                    best_label = int(candidate)
            pred = best_label
        predictions.append(pred)

    confusion = np.zeros((len(classes), len(classes)), dtype=int)
    for real, pred in zip(y_test, predictions):
        confusion[int(real), int(pred)] += 1

    accuracy = float(np.trace(confusion)) / max(1, int(confusion.sum()))
    report = []
    for i, label in enumerate(classes):
        tp = float(confusion[i, i])
        fp = float(confusion[:, i].sum() - tp)
        fn = float(confusion[i, :].sum() - tp)
        precision = tp / (tp + fp + 1e-10)
        recall = tp / (tp + fn + 1e-10)
        f1 = 2 * precision * recall / (precision + recall + 1e-10)
        report.append(
            {
                "classe": label,
                "precision": _safe_round(precision, 4),
                "rappel": _safe_round(recall, 4),
                "f1": _safe_round(f1, 4),
            }
        )

    return {
        "methode": "K-Nearest Neighbors (k=3)",
        "classes": classes,
        "matrice_confusion": confusion.tolist(),
        "accuracy": _safe_round(accuracy, 4),
        "rapport": report,
    }


def _kmeans_regions(regional_rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not regional_rows:
        return {
            "methode": "K-Means (k=3 clusters)",
            "clusters": [],
            "inertie": 0.0,
            "silhouette": 0.0,
        }

    matrix = np.array(
        [
            [
                row["articles_critique"],
                row["articles_eleve"],
                row["articles_modere"],
                row["nb_sources"],
                row["indice_pollution"],
                row["nb_articles"],
            ]
            for row in regional_rows
        ],
        dtype=float,
    )
    means = matrix.mean(axis=0)
    stds = matrix.std(axis=0)
    stds[stds == 0] = 1.0
    scaled = (matrix - means) / stds

    np.random.seed(42)
    labels_list, centroids_scaled = kmeans(scaled, k=min(3, len(scaled)), iterations=60)
    labels = np.array(labels_list, dtype=int) if labels_list else np.array([], dtype=int)
    centroids_scaled = np.array(centroids_scaled, dtype=float) if centroids_scaled else np.array([], dtype=float)

    if len(labels) == 0:
        return {
            "methode": "K-Means (k=3 clusters)",
            "clusters": [],
            "inertie": 0.0,
            "silhouette": 0.0,
        }

    inertia = 0.0
    for i, point in enumerate(scaled):
        centroid = centroids_scaled[labels[i]]
        inertia += float(np.sum((point - centroid) ** 2))

    silhouette = _silhouette_score(scaled, labels)

    cluster_map: dict[int, dict[str, Any]] = {}
    for idx, label in enumerate(labels):
        label = int(label)
        if label not in cluster_map:
            cluster_map[label] = {
                "regions": [],
                "pollution_values": [],
                "nb_articles": 0,
            }
        cluster_map[label]["regions"].append(regional_rows[idx]["region"])
        cluster_map[label]["pollution_values"].append(float(regional_rows[idx]["indice_pollution"]))
        cluster_map[label]["nb_articles"] += int(regional_rows[idx]["nb_articles"])

    clusters = []
    for raw_id, payload in sorted(cluster_map.items(), key=lambda pair: pair[0]):
        centroid_pollution = float(np.mean(payload["pollution_values"])) if payload["pollution_values"] else 0.0
        if centroid_pollution >= 70:
            label_name, color = "Zone critique", "#b00020"
        elif centroid_pollution >= 45:
            label_name, color = "Zone elevée", "#b37a00"
        else:
            label_name, color = "Zone modérée", "#2b4ea1"
        cluster_letter = chr(ord("A") + raw_id)
        clusters.append(
            {
                "id": raw_id + 1,
                "nom": f"Cluster {cluster_letter} — {label_name}",
                "couleur": color,
                "regions": sorted(payload["regions"]),
                "centroid_pollution": _safe_round(centroid_pollution, 2),
                "nb_articles": payload["nb_articles"],
            }
        )

    return {
        "methode": "K-Means (k=3 clusters)",
        "clusters": clusters,
        "inertie": _safe_round(inertia, 4),
        "silhouette": silhouette,
    }


@app.route("/api/stats-ml", methods=["GET"])
def api_get_stats_ml():
    _ensure_initialized()
    rows = _fetch_stats_rows()
    regional_rows = _build_regional_dataset(rows)

    x_simple = [row["nb_articles"] for row in regional_rows]
    y_simple = [row["indice_pollution"] for row in regional_rows]
    slope, intercept, r2_simple = regression_lineaire(x_simple, y_simple)
    points_simple = [
        {"x": int(row["nb_articles"]), "y": float(row["indice_pollution"]), "region": row["region"]}
        for row in regional_rows
    ]

    feature_names = ["articles_critique", "articles_eleve", "articles_modere", "nb_sources"]
    x_multiple = np.array(
        [
            [
                row["articles_critique"],
                row["articles_eleve"],
                row["articles_modere"],
                row["nb_sources"],
            ]
            for row in regional_rows
        ],
        dtype=float,
    )
    y_multiple = np.array([row["indice_pollution"] for row in regional_rows], dtype=float)
    y_pred, coefficients, intercept_multiple, r2_multiple = _multiple_regression(x_multiple, y_multiple)

    multiple_regions = []
    for idx, row in enumerate(regional_rows):
        multiple_regions.append(
            {
                "region": row["region"],
                "articles_critique": int(row["articles_critique"]),
                "articles_eleve": int(row["articles_eleve"]),
                "articles_modere": int(row["articles_modere"]),
                "nb_sources": int(row["nb_sources"]),
                "indice_pollution": float(row["indice_pollution"]),
                "indice_pollution_pred": _safe_round(y_pred[idx], 2) if len(y_pred) else 0.0,
                "nb_articles": int(row["nb_articles"]),
            }
        )

    coefficients_payload = {
        feature: _safe_round(coefficients[idx], 4) if idx < len(coefficients) else 0.0
        for idx, feature in enumerate(feature_names)
    }

    if len(x_multiple):
        normalized = x_multiple.copy().astype(float)
        means = normalized.mean(axis=0)
        stds = normalized.std(axis=0)
        stds[stds == 0] = 1.0
        normalized = (normalized - means) / stds
        pca_points_raw, variance = pca_2d(normalized)
    else:
        pca_points_raw, variance = ([], [0.0, 0.0])

    pca_points = []
    for idx, point in enumerate(pca_points_raw):
        px = point[0] if len(point) > 0 else 0.0
        py = point[1] if len(point) > 1 else 0.0
        region_name = regional_rows[idx]["region"] if idx < len(regional_rows) else f"region-{idx}"
        pca_points.append(
            {
                "x": _safe_round(px, 4),
                "y": _safe_round(py, 4),
                "label": region_name,
                "region": region_name,
            }
        )

    payload = {
        "regression_simple": {
            "x_label": "Nombre d'articles",
            "y_label": "Indice de pollution estimé",
            "points": points_simple,
            "r2": r2_simple,
            "slope": slope,
            "intercept": intercept,
        },
        "regression_multiple": {
            "features": feature_names,
            "target": "indice_pollution",
            "regions": multiple_regions,
            "coefficients": coefficients_payload,
            "intercept": _safe_round(intercept_multiple, 4),
            "r2": r2_multiple,
        },
        "reduction_dim": {
            "methode": "PCA simulée (2 composantes)",
            "points": pca_points,
            "variance_expliquee": variance,
        },
        "classification_supervisee": _knn_classification(rows),
        "classification_non_supervisee": _kmeans_regions(multiple_regions),
    }

    return jsonify(payload)


@app.route("/api/articles", methods=["GET"])
def api_get_articles():
    """Liste d'articles filtrables."""
    _ensure_initialized()
    region = request.args.get("region")
    theme = request.args.get("theme")
    limit_param = request.args.get("limit", "50")

    if region and region not in ALLOWED_REGIONS:
        return jsonify({"error": "Paramètre region invalide"}), 400
    if theme and theme not in ALLOWED_THEMES:
        return jsonify({"error": "Paramètre theme invalide"}), 400

    try:
        limit = int(limit_param)
    except ValueError:
        return jsonify({"error": "Paramètre limit invalide"}), 400

    articles = get_articles(region=region, theme=theme, limit=limit)
    return jsonify({"articles": articles, "total": len(articles)})


@app.route("/api/articles/<article_id>", methods=["GET"])
def api_get_article_by_id(article_id: str):
    """Retourne un article par son ID."""
    _ensure_initialized()
    article = get_article_by_id(article_id)
    if not article:
        return jsonify({"error": "Article introuvable"}), 404
    return jsonify(article)


@app.route("/api/stats", methods=["GET"])
def api_get_stats():
    """Retourne la dernière statistique agrégée."""
    _ensure_initialized()
    stats = get_stats()
    return jsonify(stats)


@app.route("/api/alerts", methods=["GET"])
def api_get_alerts():
    """Retourne les alertes actives."""
    _ensure_initialized()
    alerts = get_alerts()
    return jsonify({"alerts": alerts})


@app.route("/api/scrape", methods=["POST"])
def api_trigger_scrape():
    """Déclenche manuellement un scraping complet."""
    _ensure_initialized()
    try:
        thread = threading.Thread(target=scrape_all, daemon=True)
        thread.start()
        return jsonify(
            {
                "status": "started",
                "message": "Scraping déclenché en arrière-plan.",
            }
        )
    except Exception:
        LOGGER.exception("Erreur pendant /api/scrape")
        return jsonify({"status": "error", "message": "Échec du scraping manuel"}), 500


@app.route("/api/health", methods=["GET"])
def api_health():
    """Endpoint de santé de l'API."""
    _ensure_initialized()
    return jsonify(
        {
            "status": "ok",
            "db_articles": count_articles(),
            "last_scrape": get_last_scrape_time(),
        }
    )


if __name__ == "__main__":
    _ensure_initialized()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
