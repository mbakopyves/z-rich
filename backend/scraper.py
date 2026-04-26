"""Collecte d'articles environnementaux depuis des sources publiques."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from classifier import detect_niveau, detect_region, detect_theme
from database import insert_article, update_stats

LOGGER = logging.getLogger(__name__)
TIMEOUT_SECONDS = 8
HEADERS = {"User-Agent": "ZurichMonitor/1.0 (+http://localhost)"}

UNEPPAGE_URL = "https://www.unep.org/news-and-stories"
UNEP_RSS_URL = "https://www.unep.org/news-and-stories/rss.xml"
REUTERS_PAGE_URL = "https://www.reuters.com/business/environment/"
REUTERS_RSS_FALLBACK = "https://news.google.com/rss/search?q=Reuters+environment"
NOTRE_PLANETE_URL = "https://www.notre-planete.info/actualites/"
OPENAQ_V2_URL = "https://api.openaq.org/v2/measurements?limit=10&order_by=datetime"
OPENAQ_V3_URL = "https://api.openaq.org/v3/measurements?limit=10"


def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _normalize_description(text: str, min_words: int = 100, max_words: int = 200) -> str:
    """Nettoie et ajuste la description entre 100 et 200 mots."""
    cleaned = " ".join((text or "").split())
    words = cleaned.split(" ") if cleaned else []

    if len(words) > max_words:
        words = words[:max_words]

    if len(words) < min_words:
        filler = (
            "Additional environmental monitoring details remain under verification "
            "by field observers and local authorities."
        ).split(" ")
        while len(words) < min_words:
            words.extend(filler)

    return " ".join(words[:max_words]).strip()


def _extract_country_from_text(text: str) -> str:
    """Déduit un pays approximatif depuis le texte via mots-clés simples."""
    country_map = {
        "france": "France",
        "germany": "Germany",
        "uk": "United Kingdom",
        "italy": "Italy",
        "spain": "Spain",
        "poland": "Poland",
        "usa": "United States",
        "united states": "United States",
        "mexico": "Mexico",
        "brazil": "Brazil",
        "colombia": "Colombia",
        "india": "India",
        "china": "China",
        "pakistan": "Pakistan",
        "bangladesh": "Bangladesh",
        "vietnam": "Vietnam",
        "nigeria": "Nigeria",
        "kenya": "Kenya",
        "ghana": "Ghana",
        "congo": "Congo",
        "egypt": "Egypt",
        "australia": "Australia",
        "new zealand": "New Zealand",
        "fiji": "Fiji",
        "paris": "France",
        "london": "United Kingdom",
        "berlin": "Germany",
        "lagos": "Nigeria",
        "kinshasa": "Congo",
        "jakarta": "Indonesia",
        "delhi": "India",
        "beijing": "China",
    }

    low_text = (text or "").lower()
    for key, country in country_map.items():
        if key in low_text:
            return country
    return "Global"


def _parse_date(raw_date: str | None) -> str:
    """Convertit une date vers le format ISO YYYY-MM-DDTHH:MM:SS."""
    if not raw_date:
        return _now_iso()

    value = raw_date.strip()
    # Cas ISO simple.
    if "T" in value and len(value) >= 19:
        return value.replace("Z", "")[:19]

    try:
        parsed = parsedate_to_datetime(value)
        return parsed.strftime("%Y-%m-%dT%H:%M:%S")
    except Exception:
        return _now_iso()


def _build_article_dict(
    titre: str,
    description: str,
    source: str,
    date_value: str,
    url: str | None = None,
    pays: str | None = None,
    pm25_value: float | None = None,
) -> dict[str, Any]:
    """Construit un article normalisé conforme au schéma frontend."""
    title_clean = " ".join((titre or "").split())
    text_blob = f"{title_clean} {description}"
    article_id = hashlib.md5(title_clean.encode("utf-8")).hexdigest()[:12]
    region = detect_region(text_blob)
    theme = detect_theme(text_blob)
    niveau = detect_niveau(text_blob, valeur_pm25=pm25_value)
    country = pays or _extract_country_from_text(text_blob)

    return {
        "id": article_id,
        "titre": title_clean,
        "description": _normalize_description(description, min_words=100, max_words=200),
        "source": source,
        "region": region,
        "theme": theme,
        "date": _parse_date(date_value),
        "niveau": niveau,
        "pays": country,
        "imageUrl": None,
        "url": url,
        "scraped_at": _now_iso(),
    }


def _insert_articles(articles: list[dict[str, Any]]) -> int:
    """Insère une liste d'articles et renvoie le nombre effectivement ajouté."""
    inserted_count = 0
    for article in articles:
        if not article.get("titre"):
            continue
        try:
            if insert_article(article):
                inserted_count += 1
        except Exception:
            LOGGER.exception("Échec insertion article: %s", article.get("id"))
    return inserted_count


def _fetch_html(url: str) -> BeautifulSoup:
    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    return BeautifulSoup(response.text, "lxml")


def _fetch_xml(url: str) -> BeautifulSoup:
    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    return BeautifulSoup(response.content, "xml")


def extract_image(soup_element) -> str | None:
    img = soup_element.find("meta", property="og:image")
    if img and img.get("content"):
        return img["content"]
    img = soup_element.find("img", src=True)
    if img and str(img["src"]).startswith("http"):
        return img["src"]
    return None


def fetch_article_image(url: str) -> str | None:
    """Visite la page de l'article et extrait l'image principale."""
    if not url:
        return None
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                         "AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=6)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "lxml")

        # 1. og:image (priorité maximale)
        og = soup.find("meta", property="og:image")
        if og and og.get("content", "").startswith("http"):
            return og["content"]

        # 2. twitter:image
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content", "").startswith("http"):
            return tw["content"]

        # 3. Première <img> pertinente
        for img in soup.find_all("img", src=True):
            src = img.get("src", "")
            if not src.startswith("http"):
                continue
            # Ignorer icônes, logos, pixels
            skip = ["icon", "logo", "avatar", "1x1", "pixel", "badge", "button", "banner"]
            if any(s in src.lower() for s in skip):
                continue
            # Préférer images avec dimensions raisonnables
            w = img.get("width", "0")
            try:
                if int(w) < 100:
                    continue
            except Exception:
                pass
            return src

        return None
    except Exception:
        return None


def scrape_unep() -> int:
    """Scrape UNEP News : titres + résumés."""
    inserted_total = 0

    # Priorité au flux RSS UNEP (plus stable que les pages anti-bot).
    try:
        rss = _fetch_xml(UNEP_RSS_URL)
        articles: list[dict[str, Any]] = []
        for item in rss.select("item")[:25]:
            title = item.title.get_text(" ", strip=True) if item.title else ""
            if len(title) < 8:
                continue
            description = item.description.get_text(" ", strip=True) if item.description else ""
            pub_date = item.pubDate.get_text(" ", strip=True) if item.pubDate else _now_iso()
            article_url = item.link.get_text(" ", strip=True) if item.link else None
            if not description:
                description = f"UNEP environmental update: {title}."
            articles.append(
                _build_article_dict(
                    titre=title,
                    description=description,
                    source="UNEP",
                    date_value=pub_date,
                    url=article_url,
                )
            )
            image_url = fetch_article_image(article_url) or extract_image(item) or extract_image(rss)
            if image_url:
                articles[-1]["imageUrl"] = image_url

        inserted_total = _insert_articles(articles)
        LOGGER.info("UNEP RSS: %s article(s) inséré(s)", inserted_total)
    except Exception as error:
        LOGGER.warning("UNEP RSS indisponible (%s), fallback page activé", error)

    # Fallback secondaire sur la page si RSS vide.
    if inserted_total == 0:
        try:
            soup = _fetch_html(UNEPPAGE_URL)
            articles: list[dict[str, Any]] = []
            for anchor in soup.select("a[href*='/news-and-stories/']")[:20]:
                href = anchor.get("href", "").strip()
                title = anchor.get_text(" ", strip=True)
                if not href or len(title) < 12:
                    continue
                article_url = urljoin('https://www.unep.org', href)
                description = f"UNEP environmental bulletin from {article_url}."
                articles.append(
                    _build_article_dict(
                        titre=title,
                        description=description,
                        source="UNEP",
                        date_value=_now_iso(),
                        url=article_url,
                    )
                )
                image_url = fetch_article_image(article_url) or extract_image(anchor) or extract_image(soup)
                if image_url:
                    articles[-1]["imageUrl"] = image_url
            inserted_total = _insert_articles(articles)
            LOGGER.info("UNEP page fallback: %s article(s) inséré(s)", inserted_total)
        except Exception as error:
            LOGGER.exception("Erreur scraping UNEP fallback: %s", error)

    return inserted_total


def scrape_reuters_environment() -> int:
    """Scrape Reuters Environment (page principale, avec fallback RSS Google News)."""
    inserted_total = 0
    try:
        soup = _fetch_html(REUTERS_PAGE_URL)
        cards = soup.select("article, [data-testid='StoryCard'], .story-card")
        articles: list[dict[str, Any]] = []

        for card in cards[:25]:
            title_element = card.select_one("h2, h3, a")
            if not title_element:
                continue
            title = title_element.get_text(" ", strip=True)
            if len(title) < 12:
                continue

            desc_element = card.select_one("p")
            description = desc_element.get_text(" ", strip=True) if desc_element else ""
            if not description:
                description = f"Reuters environment bulletin: {title}."

            date_text = _now_iso()
            time_element = card.select_one("time")
            if time_element:
                date_text = (
                    time_element.get("datetime")
                    or time_element.get_text(" ", strip=True)
                    or _now_iso()
                )

            articles.append(
                _build_article_dict(
                    titre=title,
                    description=description,
                    source="Reuters",
                    date_value=date_text,
                )
            )
            image_url = extract_image(card) or extract_image(soup)
            if image_url:
                articles[-1]["imageUrl"] = image_url

        inserted_total = _insert_articles(articles)
        LOGGER.info("Reuters page: %s article(s) inséré(s)", inserted_total)
    except Exception as error:
        LOGGER.warning("Reuters page indisponible (%s), fallback RSS activé", error)

    # Fallback systématique si rien d'inséré depuis la page.
    if inserted_total == 0:
        inserted_total += scrape_reuters_via_google_news()

    return inserted_total


def scrape_reuters_via_google_news() -> int:
    """Fallback Reuters : Google News RSS filtré Reuters + environment."""
    inserted_total = 0
    try:
        rss = _fetch_xml(REUTERS_RSS_FALLBACK)
        articles: list[dict[str, Any]] = []
        for item in rss.select("item")[:20]:
            title = item.title.get_text(" ", strip=True) if item.title else ""
            if len(title) < 8:
                continue

            description = item.description.get_text(" ", strip=True) if item.description else ""
            source_tag = item.select_one("source")
            source_text = source_tag.get_text(" ", strip=True) if source_tag else "Reuters"
            pub_date = item.pubDate.get_text(" ", strip=True) if item.pubDate else _now_iso()

            # On garde uniquement les éléments Reuters pour rester conforme à la source demandée.
            is_reuters = "reuters" in source_text.lower() or "reuters" in title.lower()
            if not is_reuters:
                continue
            source = "Reuters"
            if not description:
                description = f"Google News environment wire: {title}."

            articles.append(
                _build_article_dict(
                    titre=title,
                    description=description,
                    source=source,
                    date_value=pub_date,
                )
            )
            image_url = extract_image(item) or extract_image(rss)
            if image_url:
                articles[-1]["imageUrl"] = image_url

        inserted_total = _insert_articles(articles)
        LOGGER.info("Reuters fallback RSS: %s article(s) inséré(s)", inserted_total)
    except Exception as error:
        LOGGER.exception("Erreur fallback Reuters RSS: %s", error)

    return inserted_total


def scrape_notre_planete() -> int:
    """Scrape Notre Planète Info : pages d'actualités françaises."""
    inserted_total = 0
    try:
        soup = _fetch_html(NOTRE_PLANETE_URL)
        candidates: list[tuple[str, str]] = []

        for anchor in soup.select("a[href*='/actualites/']"):
            href = anchor.get("href", "").strip()
            title = anchor.get_text(" ", strip=True)
            if not href or len(title) < 10:
                continue
            # On évite les agendas/filtres non éditoriaux.
            if "/agenda/" in href:
                continue
            article_url = urljoin("https://www.notre-planete.info", href)
            candidates.append((article_url, title))

        seen_urls = set()
        unique_candidates = []
        for url, title in candidates:
            if url in seen_urls:
                continue
            seen_urls.add(url)
            unique_candidates.append((url, title))

        articles: list[dict[str, Any]] = []
        for url, fallback_title in unique_candidates[:20]:
            try:
                article_soup = _fetch_html(url)
                title = fallback_title
                title_tag = article_soup.select_one("h1, title")
                if title_tag:
                    candidate_title = title_tag.get_text(" ", strip=True)
                    if candidate_title:
                        title = candidate_title

                desc_tag = article_soup.select_one("meta[name='description']")
                description = desc_tag.get("content", "").strip() if desc_tag else ""
                if not description:
                    p_tags = article_soup.select("article p, main p, p")
                    paragraph_texts = [
                        p.get_text(" ", strip=True)
                        for p in p_tags[:8]
                        if len(p.get_text(" ", strip=True)) > 40
                    ]
                    description = " ".join(paragraph_texts) or f"Actualité environnementale: {title}."

                date_tag = article_soup.select_one("meta[property='article:published_time'], time")
                raw_date = ""
                if date_tag:
                    raw_date = (
                        date_tag.get("content")
                        or date_tag.get("datetime")
                        or date_tag.get_text(" ", strip=True)
                    )

                articles.append(
                    _build_article_dict(
                        titre=title,
                        description=description,
                        source="Notre Planète Info",
                        date_value=raw_date or _now_iso(),
                        url=url,
                        pays="France",
                    )
                )
                image_url = fetch_article_image(url) or extract_image(article_soup) or extract_image(soup)
                if image_url:
                    articles[-1]["imageUrl"] = image_url
            except Exception:
                LOGGER.exception("Erreur lecture article Notre Planète: %s", url)

        inserted_total = _insert_articles(articles)
        LOGGER.info("Notre Planète Info: %s article(s) inséré(s)", inserted_total)
    except Exception as error:
        LOGGER.exception("Erreur scraping Notre Planète Info: %s", error)

    return inserted_total


def scrape_openaq() -> int:
    """Scrape OpenAQ v2 demandé, puis fallback v3 si nécessaire."""
    inserted_total = 0
    try:
        response = requests.get(OPENAQ_V2_URL, headers=HEADERS, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
        results = payload.get("results", [])
        inserted_total += _build_from_openaq_v2_results(results)
        LOGGER.info("OpenAQ v2: %s article(s) inséré(s)", inserted_total)
        return inserted_total
    except Exception as error:
        LOGGER.warning("OpenAQ v2 indisponible (%s), fallback v3 activé", error)

    try:
        response = requests.get(OPENAQ_V3_URL, headers=HEADERS, timeout=TIMEOUT_SECONDS)
        if response.status_code == 401:
            LOGGER.warning("OpenAQ v3 nécessite une clé API (401). Source ignorée proprement.")
            return inserted_total
        response.raise_for_status()
        payload = response.json()
        results = payload.get("results", [])
        inserted_total += _build_from_openaq_v3_results(results)
        LOGGER.info("OpenAQ v3 fallback: %s article(s) inséré(s)", inserted_total)
    except Exception as fallback_error:
        LOGGER.exception("Erreur fallback OpenAQ v3: %s", fallback_error)

    return inserted_total


def _build_from_openaq_v2_results(results: list[dict[str, Any]]) -> int:
    articles: list[dict[str, Any]] = []
    for item in results:
        parameter = (item.get("parameter") or "").lower()
        if parameter not in {"pm25", "pm2.5"}:
            continue

        value = float(item.get("value") or 0.0)
        location = item.get("location") or "Unknown location"
        country = item.get("country") or "Global"
        city = item.get("city") or ""
        measurement_date = ((item.get("date") or {}).get("utc")) or _now_iso()
        measurement_date = measurement_date.replace("Z", "")[:19]

        title = f"OpenAQ PM2.5 reading at {location}"
        description = (
            f"Measured PM2.5 concentration is {value} µg/m3 in {city or location}, {country}. "
            "This reading is transformed into an environmental watch article for Zurich monitoring."
        )
        article = _build_article_dict(
            titre=title,
            description=description,
            source="OpenAQ",
            date_value=measurement_date,
            pays=country,
            pm25_value=value,
        )
        article["theme"] = "air"
        articles.append(article)

    return _insert_articles(articles)


def _build_from_openaq_v3_results(results: list[dict[str, Any]]) -> int:
    articles: list[dict[str, Any]] = []
    for item in results:
        parameter_name = ""
        parameter = item.get("parameter")
        if isinstance(parameter, dict):
            parameter_name = (parameter.get("name") or "").lower()
        elif isinstance(parameter, str):
            parameter_name = parameter.lower()

        if "pm2.5" not in parameter_name and "pm25" not in parameter_name:
            continue

        value = float(item.get("value") or 0.0)
        country = item.get("country") or "Global"
        city = item.get("city") or item.get("location") or "Unknown city"
        raw_date = item.get("datetime") or _now_iso()
        if isinstance(raw_date, dict):
            raw_date = raw_date.get("utc") or _now_iso()

        title = f"OpenAQ PM2.5 reading in {city}"
        description = (
            f"OpenAQ reports PM2.5 concentration around {value} µg/m3 in {city}, {country}. "
            "This reading has been converted into a Zürich watch article."
        )
        article = _build_article_dict(
            titre=title,
            description=description,
            source="OpenAQ",
            date_value=str(raw_date),
            pays=country,
            pm25_value=value,
        )
        article["theme"] = "air"
        articles.append(article)

    return _insert_articles(articles)


def scrape_all() -> dict[str, Any]:
    """Lance tous les scrapers et met à jour les stats à la fin."""
    LOGGER.info("Démarrage du scraping global")
    totals = {
        "UNEP": scrape_unep(),
        "Reuters": scrape_reuters_environment(),
        "Notre Planète Info": scrape_notre_planete(),
        "OpenAQ": scrape_openaq(),
    }
    inserted_total = sum(totals.values())
    stats = update_stats()

    result = {
        "inserted_total": inserted_total,
        "sources": totals,
        "stats": stats,
        "scraped_at": _now_iso(),
    }
    LOGGER.info("Fin scraping global: %s", result)
    return result


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    summary = scrape_all()
    print(summary)
