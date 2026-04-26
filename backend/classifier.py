"""Classification simple basée sur des mots-clés."""

from __future__ import annotations

import unicodedata

REGION_KEYWORDS = {
    "africa": [
        "nigeria",
        "kenya",
        "ghana",
        "congo",
        "egypt",
        "afrique",
        "africa",
        "senegal",
        "cameroun",
        "ethiopia",
        "lagos",
        "kinshasa",
    ],
    "asia": [
        "india",
        "china",
        "bangladesh",
        "pakistan",
        "asie",
        "asia",
        "mumbai",
        "jakarta",
        "bangkok",
        "beijing",
        "delhi",
        "vietnam",
    ],
    "americas": [
        "brazil",
        "colombia",
        "mexico",
        "usa",
        "amerique",
        "america",
        "amazonie",
        "amazon",
        "rio",
        "sao paulo",
        "california",
    ],
    "europe": [
        "france",
        "germany",
        "uk",
        "europe",
        "paris",
        "london",
        "berlin",
        "italie",
        "espagne",
        "poland",
        "warsaw",
    ],
    "oceania": [
        "australia",
        "new zealand",
        "pacific",
        "oceanie",
        "sydney",
        "fiji",
    ],
}

THEME_KEYWORDS = {
    "waste": [
        "dechet",
        "ordure",
        "decharge",
        "plastique",
        "waste",
        "garbage",
        "landfill",
        "trash",
        "recycl",
        "bin",
    ],
    "air": [
        "air",
        "pollution atmospherique",
        "pm2.5",
        "pm10",
        "smog",
        "particule",
        "ozone",
        "aqi",
        "air quality",
    ],
    "water": [
        "eau",
        "riviere",
        "fleuve",
        "ocean",
        "water",
        "river",
        "contamination",
        "nappe phreatique",
        "groundwater",
    ],
    "soil": [
        "sol",
        "terre",
        "sediment",
        "soil",
        "land",
        "contamination",
        "mercure",
        "pesticide",
        "agriculture",
    ],
}

NIVEAU_KEYWORDS = {
    "critique": [
        "urgence",
        "catastrophe",
        "critique",
        "crisis",
        "emergency",
        "alerte rouge",
        "critical",
        "record",
        "dangereux",
        "toxic",
    ],
    "eleve": [
        "alerte",
        "hausse",
        "augmentation",
        "warning",
        "increase",
        "depasse",
        "exceeded",
        "elevated",
        "preoccupant",
    ],
    "modere": [
        "modere",
        "stable",
        "moderate",
        "concern",
        "preoccupation",
    ],
}


def _normalize(text: str) -> str:
    """Normalise le texte (minuscule, sans accents) pour les recherches de mots-clés."""
    lower_text = text.lower()
    normalized = unicodedata.normalize("NFD", lower_text)
    without_accents = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return without_accents


def detect_region(text: str) -> str:
    """Détecte la région à partir du texte."""
    normalized = _normalize(text)
    for region, keywords in REGION_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return region
    return "world"


def detect_theme(text: str) -> str:
    """Détecte le thème principal à partir du texte."""
    normalized = _normalize(text)
    for theme, keywords in THEME_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return theme
    return "waste"


def detect_niveau(text: str, valeur_pm25: float | None = None) -> str:
    """Détecte le niveau d'alerte par PM2.5 ou mots-clés."""
    if valeur_pm25 is not None:
        if valeur_pm25 > 150:
            return "critique"
        if valeur_pm25 > 55:
            return "eleve"
        if valeur_pm25 > 12:
            return "modere"
        return "info"

    normalized = _normalize(text)
    if any(keyword in normalized for keyword in NIVEAU_KEYWORDS["critique"]):
        return "critique"
    if any(keyword in normalized for keyword in NIVEAU_KEYWORDS["eleve"]):
        return "eleve"
    if any(keyword in normalized for keyword in NIVEAU_KEYWORDS["modere"]):
        return "modere"
    return "info"
