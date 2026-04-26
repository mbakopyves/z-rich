"""API Flask principale pour Zürich."""

from __future__ import annotations

import logging
import threading

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import (
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
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}})

_SCHEDULER_STARTED = False


def _ensure_initialized() -> None:
    """Initialise DB + scheduler une seule fois par process."""
    global _SCHEDULER_STARTED
    init_db()
    if not _SCHEDULER_STARTED:
        start_scheduler()
        _SCHEDULER_STARTED = True


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
    app.run(host="0.0.0.0", port=5000, debug=False)
