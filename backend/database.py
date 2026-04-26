"""Gestion SQLite pour le backend Zürich."""

from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

LOGGER = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "zürich.db"


def _get_connection() -> sqlite3.Connection:
    """Retourne une connexion SQLite configurée."""
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    """Crée les tables si elles n'existent pas."""
    with _get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                titre TEXT NOT NULL,
                description TEXT,
                source TEXT,
                region TEXT,
                theme TEXT,
                date TEXT,
                niveau TEXT,
                pays TEXT,
                imageUrl TEXT,
                scraped_at TEXT
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY,
                pollution_index REAL,
                critical_zones INTEGER,
                countries_covered INTEGER,
                articles_24h INTEGER,
                updated_at TEXT
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS active_alerts (
                id TEXT PRIMARY KEY,
                pays TEXT,
                description TEXT,
                niveau TEXT,
                created_at TEXT
            )
            """
        )
        connection.commit()


def insert_article(article_dict: dict[str, Any]) -> bool:
    """Insère un article en ignorant les doublons (retourne True si inséré)."""
    init_db()
    with _get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT OR IGNORE INTO articles
            (id, titre, description, source, region, theme, date, niveau, pays, imageUrl, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                article_dict.get("id"),
                article_dict.get("titre"),
                article_dict.get("description"),
                article_dict.get("source"),
                article_dict.get("region"),
                article_dict.get("theme"),
                article_dict.get("date"),
                article_dict.get("niveau"),
                article_dict.get("pays"),
                article_dict.get("imageUrl"),
                article_dict.get("scraped_at"),
            ),
        )
        inserted = cursor.rowcount > 0
        connection.commit()
        return inserted


def get_articles(region: str | None = None, theme: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    """Retourne une liste d'articles avec filtres optionnels."""
    init_db()
    query = """
        SELECT id, titre, description, source, region, theme, date, niveau, pays, imageUrl
        FROM articles
        WHERE 1=1
    """
    params: list[Any] = []

    if region:
        query += " AND region = ?"
        params.append(region)
    if theme:
        query += " AND theme = ?"
        params.append(theme)

    safe_limit = max(1, min(int(limit), 500))
    query += " ORDER BY date DESC LIMIT ?"
    params.append(safe_limit)

    with _get_connection() as connection:
        rows = connection.execute(query, params).fetchall()
        return [dict(row) for row in rows]


def get_article_by_id(article_id: str) -> dict[str, Any] | None:
    """Retourne un article par son ID."""
    init_db()
    with _get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, titre, description, source, region, theme, date, niveau, pays, imageUrl
            FROM articles
            WHERE id = ?
            """,
            (article_id,),
        ).fetchone()
        return dict(row) if row else None


def get_stats() -> dict[str, Any]:
    """Retourne la dernière ligne de stats."""
    init_db()
    with _get_connection() as connection:
        row = connection.execute(
            """
            SELECT pollution_index, critical_zones, countries_covered, articles_24h, updated_at
            FROM stats
            ORDER BY updated_at DESC
            LIMIT 1
            """
        ).fetchone()
        if row:
            return dict(row)

    # Valeurs par défaut si aucune stat n'existe encore.
    return {
        "pollution_index": 0.0,
        "critical_zones": 0,
        "countries_covered": 0,
        "articles_24h": 0,
        "updated_at": None,
    }


def get_alerts() -> list[dict[str, Any]]:
    """Retourne les alertes actives triées de la plus récente à la plus ancienne."""
    init_db()
    with _get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, pays, description, niveau, created_at
            FROM active_alerts
            ORDER BY created_at DESC
            """
        ).fetchall()
        return [dict(row) for row in rows]


def get_last_scrape_time() -> str | None:
    """Retourne la dernière date de scraping connue."""
    init_db()
    with _get_connection() as connection:
        row = connection.execute(
            """
            SELECT scraped_at
            FROM articles
            WHERE scraped_at IS NOT NULL
            ORDER BY scraped_at DESC
            LIMIT 1
            """
        ).fetchone()
        return row["scraped_at"] if row else None


def count_articles() -> int:
    """Compte le nombre total d'articles en base."""
    init_db()
    with _get_connection() as connection:
        row = connection.execute("SELECT COUNT(*) AS total FROM articles").fetchone()
        return int(row["total"]) if row else 0


def clear_active_alerts() -> None:
    """Supprime les alertes existantes avant recalcul."""
    init_db()
    with _get_connection() as connection:
        connection.execute("DELETE FROM active_alerts")
        connection.commit()


def insert_active_alert(alert: dict[str, Any]) -> None:
    """Insère une alerte active."""
    init_db()
    with _get_connection() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO active_alerts (id, pays, description, niveau, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                alert.get("id"),
                alert.get("pays"),
                alert.get("description"),
                alert.get("niveau"),
                alert.get("created_at"),
            ),
        )
        connection.commit()


def update_stats() -> dict[str, Any]:
    """Recalcule et enregistre les statistiques globales depuis les articles."""
    init_db()
    now = datetime.utcnow()
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%S")
    last_24h = (now - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")

    with _get_connection() as connection:
        total_articles_row = connection.execute("SELECT COUNT(*) AS total FROM articles").fetchone()
        critical_zones_row = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM articles
            WHERE niveau = 'critique'
            """
        ).fetchone()
        countries_row = connection.execute(
            """
            SELECT COUNT(DISTINCT LOWER(COALESCE(pays, '')))
            AS total
            FROM articles
            WHERE TRIM(COALESCE(pays, '')) <> ''
            """
        ).fetchone()
        recent_articles_row = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM articles
            WHERE date >= ?
            """,
            (last_24h,),
        ).fetchone()

        total_articles = int(total_articles_row["total"]) if total_articles_row else 0
        critical_zones = int(critical_zones_row["total"]) if critical_zones_row else 0
        countries_covered = int(countries_row["total"]) if countries_row else 0
        articles_24h = int(recent_articles_row["total"]) if recent_articles_row else 0

        # Indice simple et explicite: pondération du volume récent et de la criticité.
        pollution_index = round(min(100.0, articles_24h * 0.8 + critical_zones * 1.5), 2)

        connection.execute(
            """
            INSERT INTO stats (pollution_index, critical_zones, countries_covered, articles_24h, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (pollution_index, critical_zones, countries_covered, articles_24h, now_iso),
        )
        connection.commit()

    _refresh_active_alerts()

    updated = {
        "pollution_index": pollution_index,
        "critical_zones": critical_zones,
        "countries_covered": countries_covered,
        "articles_24h": articles_24h,
        "updated_at": now_iso,
    }
    LOGGER.info("Stats mises à jour: %s", updated)
    return updated


def _refresh_active_alerts() -> None:
    """Met à jour les alertes actives à partir des articles critiques/élevés récents."""
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    with _get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, pays, description, niveau
            FROM articles
            WHERE niveau IN ('critique', 'eleve')
            ORDER BY date DESC
            LIMIT 3
            """
        ).fetchall()

    clear_active_alerts()

    for row in rows:
        alert_id = f"alert-{row['id']}"
        insert_active_alert(
            {
                "id": alert_id,
                "pays": row["pays"],
                "description": row["description"],
                "niveau": row["niveau"],
                "created_at": now_iso,
            }
        )


init_db()
