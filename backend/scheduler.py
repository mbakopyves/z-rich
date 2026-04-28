"""Planification périodique du scraping et du recalcul des stats."""

from __future__ import annotations

import atexit
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from database import count_articles, update_stats
from scraper import scrape_all

LOGGER = logging.getLogger(__name__)


class WaniwaScheduler:
    """Encapsule la gestion du scheduler pour un arrêt propre."""

    def __init__(self) -> None:
        self.scheduler = BackgroundScheduler()
        self._started = False
        self._shutdown_registered = False

    def start(self) -> None:
        """Démarre les jobs périodiques."""
        if self._started:
            return

        self.scheduler.add_job(
            scrape_all,
            trigger=IntervalTrigger(hours=24),
            id="scrape_all_daily",
            replace_existing=True,
        )
        self.scheduler.add_job(
            update_stats,
            trigger=IntervalTrigger(hours=1),
            id="update_stats_hourly",
            replace_existing=True,
        )
        self.scheduler.start()
        self._started = True
        LOGGER.info("Scheduler démarré avec jobs 24h et 1h")

        # Scraping immédiat au démarrage si la base est vide.
        if count_articles() == 0:
            LOGGER.info("Base vide détectée, lancement immédiat de scrape_all()")
            try:
                scrape_all()
            except Exception:
                LOGGER.exception("Erreur lors du scraping initial")
        else:
            # Si base non vide, on s'assure au moins que les stats sont actualisées.
            try:
                update_stats()
            except Exception:
                LOGGER.exception("Erreur lors de la mise à jour initiale des stats")

        if not self._shutdown_registered:
            atexit.register(self.shutdown)
            self._shutdown_registered = True

    def shutdown(self) -> None:
        """Arrêt propre du scheduler."""
        if self._started and self.scheduler.running:
            LOGGER.info("Arrêt du scheduler")
            self.scheduler.shutdown(wait=False)
        self._started = False


_SCHEDULER_INSTANCE: WaniwaScheduler | None = None


def get_scheduler() -> WaniwaScheduler:
    """Retourne une instance singleton du scheduler."""
    global _SCHEDULER_INSTANCE
    if _SCHEDULER_INSTANCE is None:
        _SCHEDULER_INSTANCE = ZurichScheduler()
    return _SCHEDULER_INSTANCE


def start_scheduler() -> WaniwaScheduler:
    """Raccourci pour démarrer le scheduler."""
    scheduler = get_scheduler()
    scheduler.start()
    return scheduler
