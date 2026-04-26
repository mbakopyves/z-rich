import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import styles from './App.module.css';

const NAV_ITEMS = ['actualites', 'carte', 'donnees', 'alertes', 'rapports'];
const REGION_KEYS = ['world', 'africa', 'asia', 'americas', 'europe', 'oceania'];
const THEME_KEYS = ['all', 'waste', 'air', 'water', 'soil'];
const LANGUAGE_CODES = ['fr', 'en', 'es', 'ar'];
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const LEAFLET_CSS_CDN = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEVEL_COLORS = {
  critique: '#b00020',
  eleve: '#b37a00',
  modere: '#2b4ea1',
  info: '#4b4b4b'
};
const LEVEL_ORDER = ['critique', 'eleve', 'modere', 'info'];
const THEME_ORDER = ['waste', 'air', 'water', 'soil'];
const COUNTRY_COORDS = {
  france: [46.2, 2.2],
  spain: [40.4, -3.7],
  romania: [45.9, 24.9],
  niger: [17.6, 8.0],
  ghana: [7.9, -1.0],
  iraq: [33.2, 43.7],
  indonesia: [-2.5, 118],
  peru: [-9.2, -75],
  australia: [-25.2, 133.8],
  fiji: [-17.8, 178],
  'republique dominicaine': [18.7, -70.2],
  'dominican republic': [18.7, -70.2],
  maroc: [31.8, -7.1],
  morocco: [31.8, -7.1],
  algeria: [28, 2.6],
  algerie: [28, 2.6],
  tunisia: [34, 9.5],
  tunisie: [34, 9.5],
  egypt: [26.8, 30.8],
  egypte: [26.8, 30.8],
  kenya: [0.2, 37.9],
  nigeria: [9.1, 8.7],
  india: [22.3, 78.9],
  china: [35.9, 104.2],
  japan: [36.2, 138.2],
  brazil: [-14.2, -51.9],
  brasil: [-14.2, -51.9],
  usa: [39.8, -98.6],
  'united states': [39.8, -98.6],
  canada: [56.1, -106.3],
  mexico: [23.6, -102.5],
  germany: [51.2, 10.4],
  italy: [41.9, 12.5],
  uk: [55.3, -3.4],
  'united kingdom': [55.3, -3.4],
  turkey: [39, 35.2],
  russia: [61.5, 105.3],
  ukraine: [48.4, 31.2],
  argentina: [-38.4, -63.6],
  chile: [-35.7, -71.5],
  colombia: [4.5, -74.1],
  'south africa': [-30.6, 22.9],
  ethiopia: [9.1, 40.5],
  pakistan: [30.4, 69.4],
  bangladesh: [23.7, 90.3],
  thailand: [15.8, 101],
  vietnam: [14.1, 108.3],
  philippines: [12.8, 121.8],
  'saudi arabia': [24, 45],
  iran: [32.4, 53.7],
  uae: [23.4, 53.8],
  qatar: [25.3, 51.2],
  oman: [21.4, 55.9],
  yemen: [15.5, 48.5],
  'new zealand': [-40.9, 174.9],
  world: [20, 0],
  global: [20, 0],
  'multiple countries': [20, 0]
};

const TRANSLATIONS = {
  fr: {
    languageLabel: 'Langue',
    subtitle: 'Veille mondiale · insalubrité & pollution',
    navAria: 'Navigation principale',
    nav: { actualites: 'Actualités', carte: 'Carte', donnees: 'Données', alertes: 'Alertes', rapports: 'Rapports' },
    filters: {
      regions: 'Régions',
      themes: 'Thèmes',
      regionsList: {
        world: 'Monde', africa: 'Afrique', asia: 'Asie', americas: 'Amériques', europe: 'Europe', oceania: 'Océanie'
      },
      themesList: { all: 'Tous', waste: 'Déchets', air: 'Air', water: 'Eau', soil: 'Sols' }
    },
    featured: 'À la une',
    latest: 'Dernières dépêches',
    source: 'Source',
    country: 'Pays',
    globalIndicators: 'Indicateurs mondiaux',
    stats: { pollutionIndex: 'Indice pollution', criticalZones: 'Zones critiques', countriesCovered: 'Pays couverts', articles24h: 'Articles / 24h' },
    activeAlerts: 'Alertes actives',
    topics: 'Thèmes',
    export: 'Export',
    exportButtons: { pdf: 'PDF', csv: 'CSV', link: 'Lien' },
    level: { critique: 'Critique', eleve: 'Élevé', modere: 'Modéré', info: 'Info' },
    noCriticalAlerts: 'Aucune alerte critique en cours',
    noArticles: 'Aucun article ne correspond aux filtres sélectionnés.',
    common: {
      loading: 'Chargement...',
      fallbackError: 'API indisponible. Données locales affichées.',
      lastUpdated: 'Dernier article',
      dominantLevel: 'Niveau dominant',
      articleCount: "Nombre d'articles",
      triggerScrape: 'Déclencher un scraping',
      scrapingInProgress: 'Scraping en cours...'
    },
    mapPage: {
      title: 'Carte mondiale de la pollution',
      legend: 'Légende',
      noMapData: 'Aucune donnée cartographique disponible.'
    },
    dataPage: {
      title: 'Données',
      searchPlaceholder: 'Rechercher (titre, pays, source)...',
      tableHeaders: { pays: 'Pays', theme: 'Thème', niveau: 'Niveau', source: 'Source', date: 'Date' },
      page: 'Page',
      byTheme: 'Articles par thème'
    },
    alertsPage: {
      title: 'Alertes',
      critical: 'Alertes critiques',
      elevated: 'Alertes élevées',
      history: 'Historique complet',
      empty: 'Aucune alerte pour cette section.'
    },
    reportsPage: {
      title: 'Rapports',
      region: 'Région',
      theme: 'Thème',
      period: 'Période',
      reportTitle: 'Titre du rapport',
      preview: 'Prévisualisation',
      selectedArticles: 'articles sélectionnés',
      distribution: 'Répartition par niveau',
      copyMarkdown: 'Copier en Markdown',
      exportCsv: 'Exporter CSV',
      copied: 'Markdown copié',
      periods: { d7: '7j', d30: '30j', all: 'tout' },
      markdown: {
        generatedBy: 'Généré par Zürich',
        summary: 'Résumé',
        articles: 'Articles'
      }
    },
    footer: (hours, minutes, sources) => `Prochaine actualisation dans ${hours}h ${minutes}min · ${sources} sources actives`
  },
  en: {
    languageLabel: 'Language',
    subtitle: 'Global monitoring · unsanitary conditions & pollution',
    navAria: 'Main navigation',
    nav: { actualites: 'News', carte: 'Map', donnees: 'Data', alertes: 'Alerts', rapports: 'Reports' },
    filters: {
      regions: 'Regions',
      themes: 'Topics',
      regionsList: { world: 'World', africa: 'Africa', asia: 'Asia', americas: 'Americas', europe: 'Europe', oceania: 'Oceania' },
      themesList: { all: 'All', waste: 'Waste', air: 'Air', water: 'Water', soil: 'Soil' }
    },
    featured: 'Top story', latest: 'Latest dispatches', source: 'Source', country: 'Country', globalIndicators: 'Global indicators',
    stats: { pollutionIndex: 'Pollution index', criticalZones: 'Critical zones', countriesCovered: 'Countries covered', articles24h: 'Articles / 24h' },
    activeAlerts: 'Active alerts', topics: 'Topics', export: 'Export', exportButtons: { pdf: 'PDF', csv: 'CSV', link: 'Link' },
    level: { critique: 'Critical', eleve: 'High', modere: 'Moderate', info: 'Info' },
    noCriticalAlerts: 'No critical alert at the moment',
    noArticles: 'No article matches the selected filters.',
    common: {
      loading: 'Loading...', fallbackError: 'API unavailable. Local data displayed.', lastUpdated: 'Latest article', dominantLevel: 'Dominant level',
      articleCount: 'Number of articles', triggerScrape: 'Trigger scraping', scrapingInProgress: 'Scraping in progress...'
    },
    mapPage: { title: 'Global pollution map', legend: 'Legend', noMapData: 'No map data available.' },
    dataPage: {
      title: 'Data', searchPlaceholder: 'Search (title, country, source)...',
      tableHeaders: { pays: 'Country', theme: 'Theme', niveau: 'Level', source: 'Source', date: 'Date' }, page: 'Page', byTheme: 'Articles by theme'
    },
    alertsPage: { title: 'Alerts', critical: 'Critical alerts', elevated: 'High alerts', history: 'Full history', empty: 'No alerts for this section.' },
    reportsPage: {
      title: 'Reports', region: 'Region', theme: 'Theme', period: 'Period', reportTitle: 'Report title', preview: 'Preview', selectedArticles: 'selected articles',
      distribution: 'Distribution by level', copyMarkdown: 'Copy as Markdown', exportCsv: 'Export CSV', copied: 'Markdown copied',
      periods: { d7: '7d', d30: '30d', all: 'all' }, markdown: { generatedBy: 'Generated by Zürich', summary: 'Summary', articles: 'Articles' }
    },
    footer: (hours, minutes, sources) => `Next refresh in ${hours}h ${minutes}min · ${sources} active sources`
  },
  es: {
    languageLabel: 'Idioma',
    subtitle: 'Vigilancia mundial · insalubridad y contaminación',
    navAria: 'Navegación principal',
    nav: { actualites: 'Actualidad', carte: 'Mapa', donnees: 'Datos', alertes: 'Alertas', rapports: 'Informes' },
    filters: {
      regions: 'Regiones', themes: 'Temas',
      regionsList: { world: 'Mundo', africa: 'África', asia: 'Asia', americas: 'Américas', europe: 'Europa', oceania: 'Oceanía' },
      themesList: { all: 'Todos', waste: 'Residuos', air: 'Aire', water: 'Agua', soil: 'Suelos' }
    },
    featured: 'En portada', latest: 'Últimos cables', source: 'Fuente', country: 'País', globalIndicators: 'Indicadores globales',
    stats: { pollutionIndex: 'Índice de contaminación', criticalZones: 'Zonas críticas', countriesCovered: 'Países cubiertos', articles24h: 'Artículos / 24h' },
    activeAlerts: 'Alertas activas', topics: 'Temas', export: 'Exportar', exportButtons: { pdf: 'PDF', csv: 'CSV', link: 'Enlace' },
    level: { critique: 'Crítica', eleve: 'Alta', modere: 'Moderada', info: 'Info' },
    noCriticalAlerts: 'No hay alerta crítica en curso', noArticles: 'Ningún artículo coincide con los filtros seleccionados.',
    common: {
      loading: 'Cargando...', fallbackError: 'API no disponible. Se muestran datos locales.', lastUpdated: 'Último artículo', dominantLevel: 'Nivel dominante',
      articleCount: 'Número de artículos', triggerScrape: 'Lanzar scraping', scrapingInProgress: 'Scraping en curso...'
    },
    mapPage: { title: 'Mapa mundial de la contaminación', legend: 'Leyenda', noMapData: 'No hay datos cartográficos disponibles.' },
    dataPage: {
      title: 'Datos', searchPlaceholder: 'Buscar (título, país, fuente)...',
      tableHeaders: { pays: 'País', theme: 'Tema', niveau: 'Nivel', source: 'Fuente', date: 'Fecha' }, page: 'Página', byTheme: 'Artículos por tema'
    },
    alertsPage: { title: 'Alertas', critical: 'Alertas críticas', elevated: 'Alertas altas', history: 'Historial completo', empty: 'No hay alertas en esta sección.' },
    reportsPage: {
      title: 'Informes', region: 'Región', theme: 'Tema', period: 'Período', reportTitle: 'Título del informe', preview: 'Vista previa', selectedArticles: 'artículos seleccionados',
      distribution: 'Distribución por nivel', copyMarkdown: 'Copiar en Markdown', exportCsv: 'Exportar CSV', copied: 'Markdown copiado',
      periods: { d7: '7d', d30: '30d', all: 'todo' }, markdown: { generatedBy: 'Generado por Zürich', summary: 'Resumen', articles: 'Artículos' }
    },
    footer: (hours, minutes, sources) => `Próxima actualización en ${hours}h ${minutes}min · ${sources} fuentes activas`
  },
  ar: {
    languageLabel: 'اللغة',
    subtitle: 'مراقبة عالمية · التلوث والبيئات غير الصحية',
    navAria: 'التنقل الرئيسي',
    nav: { actualites: 'الأخبار', carte: 'الخريطة', donnees: 'البيانات', alertes: 'التنبيهات', rapports: 'التقارير' },
    filters: {
      regions: 'المناطق', themes: 'المحاور',
      regionsList: { world: 'العالم', africa: 'أفريقيا', asia: 'آسيا', americas: 'الأمريكيتان', europe: 'أوروبا', oceania: 'أوقيانوسيا' },
      themesList: { all: 'الكل', waste: 'النفايات', air: 'الهواء', water: 'المياه', soil: 'التربة' }
    },
    featured: 'العنوان الأبرز', latest: 'آخر التقارير', source: 'المصدر', country: 'الدولة', globalIndicators: 'المؤشرات العالمية',
    stats: { pollutionIndex: 'مؤشر التلوث', criticalZones: 'المناطق الحرجة', countriesCovered: 'الدول المغطاة', articles24h: 'مقالات / 24 ساعة' },
    activeAlerts: 'التنبيهات النشطة', topics: 'المحاور', export: 'تصدير', exportButtons: { pdf: 'PDF', csv: 'CSV', link: 'رابط' },
    level: { critique: 'حرج', eleve: 'مرتفع', modere: 'متوسط', info: 'معلومة' },
    noCriticalAlerts: 'لا توجد تنبيهات حرجة حالياً', noArticles: 'لا توجد مقالات مطابقة للفلاتر المحددة.',
    common: {
      loading: 'جارٍ التحميل...', fallbackError: 'واجهة API غير متاحة. تم عرض البيانات المحلية.', lastUpdated: 'آخر مقال', dominantLevel: 'المستوى الغالب',
      articleCount: 'عدد المقالات', triggerScrape: 'تشغيل الكشط', scrapingInProgress: 'الكشط جارٍ...'
    },
    mapPage: { title: 'الخريطة العالمية للتلوث', legend: 'مفتاح الألوان', noMapData: 'لا توجد بيانات خرائط متاحة.' },
    dataPage: {
      title: 'البيانات', searchPlaceholder: 'بحث (العنوان، الدولة، المصدر)...',
      tableHeaders: { pays: 'الدولة', theme: 'المحور', niveau: 'المستوى', source: 'المصدر', date: 'التاريخ' }, page: 'الصفحة', byTheme: 'المقالات حسب المحور'
    },
    alertsPage: { title: 'التنبيهات', critical: 'تنبيهات حرجة', elevated: 'تنبيهات مرتفعة', history: 'السجل الكامل', empty: 'لا توجد تنبيهات في هذا القسم.' },
    reportsPage: {
      title: 'التقارير', region: 'المنطقة', theme: 'المحور', period: 'الفترة', reportTitle: 'عنوان التقرير', preview: 'المعاينة', selectedArticles: 'مقالات مختارة',
      distribution: 'التوزيع حسب المستوى', copyMarkdown: 'نسخ Markdown', exportCsv: 'تصدير CSV', copied: 'تم نسخ Markdown',
      periods: { d7: '7 أيام', d30: '30 يومًا', all: 'الكل' }, markdown: { generatedBy: 'تم الإنشاء بواسطة Zürich', summary: 'الملخص', articles: 'المقالات' }
    },
    footer: (hours, minutes, sources) => `التحديث القادم خلال ${hours}س ${minutes}د · ${sources} مصادر نشطة`
  }
};

const ARTICLES = [
  { id: 'news-001', titre: 'Toxic ash migration detected across three shipping corridors', description: 'Satellite and port inspections confirm illegal ash transfers between coastal terminals, raising public-health concerns in densely populated harbors.', source: 'Reuters', region: 'world', theme: 'waste', date: '2026-04-26T10:42:00Z', niveau: 'critique', pays: 'Multiple countries', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-002', titre: 'Contaminación del agua obliga cierres temporales en puertos del Caribe', description: 'Nuevos análisis detectan niveles de hidrocarburos por encima de los límites recomendados en zonas de pesca artesanal.', source: 'Agencia EFE', region: 'americas', theme: 'water', date: '2026-04-26T09:58:00Z', niveau: 'eleve', pays: 'República Dominicana', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-003', titre: 'Décharges ouvertes: hausse de particules fines dans deux capitales sahéliennes', description: 'Des mesures indépendantes indiquent une hausse marquée des PM2.5 autour de sites de brûlage informel de déchets ménagers.', source: 'Le Monde Afrique', region: 'africa', theme: 'air', date: '2026-04-26T09:20:00Z', niveau: 'critique', pays: 'Niger', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-004', titre: 'Riverbank cleanup delayed as heavy metal readings remain unstable', description: 'Environmental labs warn that remediation targets are slipping as cadmium concentration fluctuates after seasonal flooding.', source: 'BBC World', region: 'europe', theme: 'water', date: '2026-04-26T08:40:00Z', niveau: 'modere', pays: 'Romania', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-005', titre: 'تسرب نفايات صناعية قرب مجرى نهري يثير احتجاجات محلية', description: 'أكدت فرق الرصد البيئي وجود مخلفات كيميائية في محيط مواقع تصنيع غير ملتزمة بمعايير السلامة.', source: 'Al Jazeera', region: 'asia', theme: 'waste', date: '2026-04-26T08:10:00Z', niveau: 'eleve', pays: 'Iraq', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-006', titre: 'Plastics leakage index worsens in South Pacific shipping lanes', description: 'Audit reports show microplastic concentration spikes near high-traffic maritime routes and informal dumping points.', source: 'Reuters', region: 'oceania', theme: 'waste', date: '2026-04-26T07:46:00Z', niveau: 'modere', pays: 'Fiji', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-007', titre: 'Indice global de pollution atmosphérique: 12 mégapoles en vigilance élevée', description: "La dernière consolidation des capteurs urbains confirme une aggravation continue de l'exposition sur les grands axes logistiques.", source: 'AFP', region: 'world', theme: 'air', date: '2026-04-26T07:20:00Z', niveau: 'eleve', pays: 'Global', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-008', titre: 'Incendios en vertederos ilegales elevan riesgos sanitarios en la periferia', description: 'Organizaciones comunitarias denuncian la falta de planes de contingencia y evacuación para barrios cercanos.', source: 'El País', region: 'americas', theme: 'air', date: '2026-04-26T06:52:00Z', niveau: 'critique', pays: 'Perú', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-009', titre: 'Groundwater nitrate alerts extended across major farming districts', description: 'A joint bulletin urges local authorities to monitor wells as nitrate concentrations exceed seasonal norms.', source: 'Financial Times', region: 'europe', theme: 'soil', date: '2026-04-26T06:10:00Z', niveau: 'info', pays: 'Spain', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-010', titre: 'Accumulation de déchets électroniques dans les zones portuaires d’Afrique de l’Ouest', description: 'Les contrôles douaniers signalent une hausse des arrivages non conformes, avec des filières de recyclage insuffisantes.', source: 'Mongabay', region: 'africa', theme: 'waste', date: '2026-04-26T05:34:00Z', niveau: 'modere', pays: 'Ghana', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-011', titre: 'Coastal sediments show elevated mercury levels after storm season', description: 'Lab teams documented persistent contamination pockets near estuaries that supply nearby urban districts.', source: 'The Guardian', region: 'asia', theme: 'soil', date: '2026-04-26T04:58:00Z', niveau: 'eleve', pays: 'Indonesia', imageUrl: null, url: 'https://www.reuters.com' },
  { id: 'news-012', titre: 'Oceania health monitors report stable air quality despite wildfire smoke', description: 'Public agencies observed short-lived peaks, but overall exposure remained within emergency thresholds.', source: 'ABC Pacific', region: 'oceania', theme: 'air', date: '2026-04-26T03:41:00Z', niveau: 'info', pays: 'Australia', imageUrl: null }
];

const GLOBAL_STATS = { pollutionIndex: '72/100', criticalZones: '49', countriesCovered: '132', articles24h: '287' };

const ACTIVE_ALERTS = [
  { id: 'alert-1', niveau: 'critique', message: { fr: 'Rejets toxiques multipoints dans le corridor atlantique.', en: 'Multi-point toxic discharge in the Atlantic corridor.', es: 'Vertidos tóxicos en múltiples puntos del corredor atlántico.', ar: 'تصريف سام متعدد النقاط في الممر الأطلسي.' } },
  { id: 'alert-2', niveau: 'eleve', message: { fr: "Hausse durable des PM2.5 autour de plusieurs zones d'enfouissement.", en: 'Sustained PM2.5 increase around multiple landfill zones.', es: 'Aumento sostenido de PM2.5 alrededor de varios vertederos.', ar: 'ارتفاع مستمر في PM2.5 حول عدة مناطق طمر نفايات.' } },
  { id: 'alert-3', niveau: 'critique', message: { fr: "Pollution de l'eau confirmée sur trois bassins d'approvisionnement.", en: 'Water contamination confirmed in three supply basins.', es: 'Contaminación del agua confirmada en tres cuencas de abastecimiento.', ar: 'تلوث المياه مؤكد في ثلاثة أحواض إمداد.' } }
];

const LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', ar: 'ar-EG' };

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getLevelClassName(level) {
  if (level === 'critique') return styles.levelCritique;
  if (level === 'eleve') return styles.levelEleve;
  if (level === 'modere') return styles.levelModere;
  return styles.levelInfo;
}

function formatDate(dateIso, language) {
  const parsedDate = new Date(dateIso);
  if (Number.isNaN(parsedDate.getTime())) return dateIso;
  return new Intl.DateTimeFormat(LOCALES[language], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsedDate);
}

function normalizeArticle(rawArticle, index) {
  return {
    id: rawArticle?.id || `article-${index}`,
    titre: rawArticle?.titre || rawArticle?.title || 'Untitled',
    description: rawArticle?.description || '',
    source: rawArticle?.source || 'Unknown',
    region: rawArticle?.region || 'world',
    theme: THEME_KEYS.includes(rawArticle?.theme) ? rawArticle.theme : 'waste',
    date: rawArticle?.date || new Date().toISOString(),
    niveau: LEVEL_ORDER.includes(rawArticle?.niveau) ? rawArticle.niveau : 'info',
    pays: rawArticle?.pays || 'Global',
    imageUrl: rawArticle?.imageUrl || null
  };
}

async function fetchArticles(region, theme) {
  const query = new URLSearchParams();
  if (region && region !== 'world') query.set('region', region);
  if (theme && theme !== 'all') query.set('theme', theme);
  query.set('limit', '400');
  const response = await fetch(`${API_BASE}/articles?${query.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const apiArticles = Array.isArray(payload.articles) ? payload.articles : [];
  return apiArticles.map(normalizeArticle);
}

async function fetchStats() {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return {
    pollutionIndex: typeof payload.pollution_index === 'number' ? `${Math.round(payload.pollution_index)}/100` : GLOBAL_STATS.pollutionIndex,
    criticalZones: payload.critical_zones != null ? String(payload.critical_zones) : GLOBAL_STATS.criticalZones,
    countriesCovered: payload.countries_covered != null ? String(payload.countries_covered) : GLOBAL_STATS.countriesCovered,
    articles24h: payload.articles_24h != null ? String(payload.articles_24h) : GLOBAL_STATS.articles24h
  };
}

async function fetchAlerts() {
  const response = await fetch(`${API_BASE}/alerts`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const apiAlerts = Array.isArray(payload.alerts) ? payload.alerts : [];
  return apiAlerts.map((alertItem, index) => ({
    id: alertItem.id || `alert-${index}`,
    niveau: LEVEL_ORDER.includes(alertItem.niveau) ? alertItem.niveau : 'info',
    description: alertItem.description || '',
    message: {
      fr: alertItem.description || '',
      en: alertItem.description || '',
      es: alertItem.description || '',
      ar: alertItem.description || ''
    }
  }));
}

function getSectionFromPath(pathname) {
  if (pathname === '/carte') return 'carte';
  if (pathname === '/donnees') return 'donnees';
  if (pathname === '/alertes') return 'alertes';
  if (pathname === '/rapports') return 'rapports';
  return 'actualites';
}

function getPathFromSection(section) {
  if (section === 'carte') return '/carte';
  if (section === 'donnees') return '/donnees';
  if (section === 'alertes') return '/alertes';
  if (section === 'rapports') return '/rapports';
  return '/';
}

function getCountryCoords(countryName, region) {
  const key = normalizeText(countryName);
  if (COUNTRY_COORDS[key]) return COUNTRY_COORDS[key];
  if (region === 'africa') return [2, 20];
  if (region === 'asia') return [25, 90];
  if (region === 'americas') return [0, -75];
  if (region === 'europe') return [50, 15];
  if (region === 'oceania') return [-22, 150];
  return [20, 0];
}

function Header({ t, activeSection, onSectionChange, language, onLanguageChange }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.brandBlock}>
          <h1 className={styles.brand}>Zürich</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>

        <label className={styles.languageControl}>
          <span>{t.languageLabel}</span>
          <select className={styles.languageSelect} value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-label={t.languageLabel}>
            {LANGUAGE_CODES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className={styles.navbar} aria-label={t.navAria}>
        {NAV_ITEMS.map((item) => (
          <button key={item} type='button' className={`${styles.navButton} ${activeSection === item ? styles.navButtonActive : ''}`} onClick={() => onSectionChange(item)}>
            {t.nav[item]}
          </button>
        ))}
      </nav>
    </header>
  );
}

function TickerBar({ articles, t }) {
  const tickerText = useMemo(() => {
    if (!articles.length) return t.noCriticalAlerts;
    return articles.map((article) => `${t.level[article.niveau]} — ${article.titre}`).join('  •  ');
  }, [articles, t]);

  return (
    <div className={styles.tickerBar} role='status' aria-live='polite'>
      <div className={styles.tickerTrack}>
        <span className={styles.tickerText}>{tickerText}</span>
        <span className={styles.tickerText} aria-hidden='true'>
          {tickerText}
        </span>
      </div>
    </div>
  );
}

function FilterBar({ t, selectedRegion, selectedTheme, onRegionChange, onThemeChange }) {
  return (
    <section className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t.filters.regions}</span>
        <div className={styles.chips}>
          {REGION_KEYS.map((region) => (
            <button key={region} type='button' className={`${styles.chip} ${selectedRegion === region ? styles.chipActive : ''}`} onClick={() => onRegionChange(region)}>
              {t.filters.regionsList[region]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t.filters.themes}</span>
        <div className={styles.chips}>
          {THEME_KEYS.map((theme) => (
            <button key={theme} type='button' className={`${styles.chip} ${selectedTheme === theme ? styles.chipActive : ''}`} onClick={() => onThemeChange(theme)}>
              {t.filters.themesList[theme]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArticleThumbnail({ article, large = false }) {
  if (article.imageUrl) {
    return <img className={`${styles.articleImage} ${large ? styles.articleImageLarge : styles.articleImageSmall}`} src={article.imageUrl} alt={article.titre} />;
  }

  const svgContent = getImageParDefaut(article.theme);
  return (
    <div
      className={`${styles.imagePlaceholder} ${large ? styles.articleImageLarge : styles.articleImageSmall}`}
      aria-hidden='true'
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

function ArticleTop({ article, t, language, onOpenArticle }) {
  if (!article) return <div className={styles.emptyState}>{t.noArticles}</div>;

  const levelClassName = getLevelClassName(article.niveau);

  return (
    <article className={styles.articleTop}>
      <div className={styles.articleTopContent}>
        <p className={styles.articleBlockTitle}>{t.featured}</p>
        <span className={`${styles.alertBadge} ${levelClassName}`}>{t.level[article.niveau]}</span>
        <h2
          className={styles.articleTopTitle}
          onClick={() => onOpenArticle && onOpenArticle({
            url: article.url,
            titre: article.titre,
            source: article.source
          })}
          style={{ cursor: 'pointer' }}
        >
          {article.titre}
        </h2>
        <p className={styles.articleDescription}>{article.description}</p>
        <div className={styles.articleMeta}>
          <span>
            {t.source}: {article.source}
          </span>
          <span>·</span>
          <span>{formatDate(article.date, language)}</span>
          <span>·</span>
          <span className={levelClassName}>{t.level[article.niveau]}</span>
        </div>
      </div>

      <ArticleThumbnail article={article} large />
    </article>
  );
}

function ArticleRow({ article, t, language, onOpenArticle }) {
  const levelClassName = getLevelClassName(article.niveau);

  return (
    <article
      className={styles.articleRow}
      onClick={() => onOpenArticle && onOpenArticle({
        url: article.url,
        titre: article.titre,
        source: article.source
      })}
      style={{ cursor: 'pointer' }}
    >
      <ArticleThumbnail article={article} />
      <div>
        <h3 className={styles.articleRowTitle}>{article.titre}</h3>
        <div className={styles.articleMeta}>
          <span>
            {t.source}: {article.source}
          </span>
          <span>·</span>
          <span>{formatDate(article.date, language)}</span>
          <span>·</span>
          <span className={levelClassName}>{t.level[article.niveau]}</span>
        </div>
      </div>
    </article>
  );
}

function Sidebar({ t, language, activeTheme, onThemeClick, stats, alerts }) {
  return (
    <aside className={styles.sidebar}>
      <section className={styles.sidebarCard}>
        <h4 className={styles.sidebarTitle}>{t.globalIndicators}</h4>
        <ul className={styles.statsList}>
          <li className={styles.statsItem}>
            <span>{t.stats.pollutionIndex}</span>
            <strong>{stats.pollutionIndex}</strong>
          </li>
          <li className={styles.statsItem}>
            <span>{t.stats.criticalZones}</span>
            <strong>{stats.criticalZones}</strong>
          </li>
          <li className={styles.statsItem}>
            <span>{t.stats.countriesCovered}</span>
            <strong>{stats.countriesCovered}</strong>
          </li>
          <li className={styles.statsItem}>
            <span>{t.stats.articles24h}</span>
            <strong>{stats.articles24h}</strong>
          </li>
        </ul>
      </section>

      <section className={styles.sidebarCard}>
        <h4 className={styles.sidebarTitle}>{t.activeAlerts}</h4>
        <ul className={styles.alertsList}>
          {alerts.map((alertItem) => (
            <li key={alertItem.id} className={`${styles.alertItem} ${alertItem.niveau === 'critique' ? styles.alertItemCritical : styles.alertItemElevated}`}>
              {alertItem.message?.[language] || alertItem.description}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.sidebarCard}>
        <h4 className={styles.sidebarTitle}>{t.topics}</h4>
        <ul className={styles.themeList}>
          {THEME_KEYS.map((theme) => (
            <li key={theme}>
              <button type='button' className={`${styles.themeButton} ${activeTheme === theme ? styles.themeButtonActive : ''}`} onClick={() => onThemeClick(theme)}>
                {t.filters.themesList[theme]}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.sidebarCard}>
        <h4 className={styles.sidebarTitle}>{t.export}</h4>
        <div className={styles.exportButtons}>
          <button type='button' className={styles.exportButton}>
            {t.exportButtons.pdf}
          </button>
          <button type='button' className={styles.exportButton}>
            {t.exportButtons.csv}
          </button>
          <button type='button' className={styles.exportButton}>
            {t.exportButtons.link}
          </button>
        </div>
      </section>
    </aside>
  );
}

function NewsroomPage({ t, language, selectedRegion, selectedTheme, onRegionChange, onThemeChange, topArticle, listArticles, criticalArticles, stats, alerts, loading, error, onOpenArticle }) {
  return (
    <main className={styles.newsroomPage}>
      <TickerBar articles={criticalArticles} t={t} />

      <FilterBar t={t} selectedRegion={selectedRegion} selectedTheme={selectedTheme} onRegionChange={onRegionChange} onThemeChange={onThemeChange} />

      <section className={styles.newsroomLayout}>
        <div className={styles.feedColumn}>
          {loading ? <div className={styles.infoText}>{t.common.loading}</div> : null}
          {error ? <div className={styles.infoText}>{error}</div> : null}
          <ArticleTop article={topArticle} t={t} language={language} onOpenArticle={onOpenArticle} />

          <h4 className={styles.feedTitle}>{t.latest}</h4>
          <div className={styles.articleRows}>
            {listArticles.length > 0 ? listArticles.map((article) => <ArticleRow key={article.id} article={article} t={t} language={language} onOpenArticle={onOpenArticle} />) : <div className={styles.emptyState}>{t.noArticles}</div>}
          </div>
        </div>

        <Sidebar t={t} language={language} activeTheme={selectedTheme} onThemeClick={onThemeChange} stats={stats} alerts={alerts} />
      </section>
    </main>
  );
}

function MapPage({ t }) {
  const [articles, setArticles] = useState(ARTICLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const linkId = 'leaflet-cdn-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_CDN;
      document.head.appendChild(link);
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchArticles('world', 'all');
        if (mounted) setArticles(fetched.length ? fetched : ARTICLES);
      } catch {
        if (mounted) {
          setArticles(ARTICLES);
          setError(t.common.fallbackError);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [t.common.fallbackError]);

  const countryMap = useMemo(() => {
    const grouped = new Map();
    for (const article of articles) {
      const country = article.pays || 'Global';
      if (!grouped.has(country)) grouped.set(country, []);
      grouped.get(country).push(article);
    }

    return Array.from(grouped.entries()).map(([country, countryArticles]) => {
      const sorted = [...countryArticles].sort((a, b) => new Date(b.date) - new Date(a.date));
      const levelCounter = { critique: 0, eleve: 0, modere: 0, info: 0 };
      for (const item of countryArticles) levelCounter[item.niveau] += 1;
      const dominantLevel = LEVEL_ORDER.reduce((best, level) => (levelCounter[level] > levelCounter[best] ? level : best), 'info');
      const latest = sorted[0];
      const coords = getCountryCoords(country, latest?.region);
      return {
        country,
        count: countryArticles.length,
        dominantLevel,
        latestTitle: latest?.titre || '-',
        coords
      };
    });
  }, [articles]);

  return (
    <main className={styles.pageSection}>
      <h2 className={styles.pageTitle}>{t.mapPage.title}</h2>
      {loading ? <div className={styles.infoText}>{t.common.loading}</div> : null}
      {error ? <div className={styles.infoText}>{error}</div> : null}
      {countryMap.length === 0 ? (
        <div className={styles.emptyState}>{t.mapPage.noMapData}</div>
      ) : (
        <div className={styles.mapWrapper}>
          <MapContainer center={[20, 0]} zoom={2} minZoom={2} className={styles.leafletMap}>
            <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' />
            {countryMap.map((countryItem) => (
              <CircleMarker
                key={countryItem.country}
                center={countryItem.coords}
                radius={Math.min(18, 6 + countryItem.count * 1.5)}
                pathOptions={{ color: LEVEL_COLORS[countryItem.dominantLevel], fillColor: LEVEL_COLORS[countryItem.dominantLevel], fillOpacity: 0.35, weight: 2 }}
              >
                <Popup>
                  <div className={styles.mapPopupTitle}>{countryItem.country}</div>
                  <div>{t.common.articleCount}: {countryItem.count}</div>
                  <div>{t.common.dominantLevel}: {t.level[countryItem.dominantLevel]}</div>
                  <div>{t.common.lastUpdated}: {countryItem.latestTitle}</div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className={styles.mapLegend}>
            <div className={styles.mapLegendTitle}>{t.mapPage.legend}</div>
            {LEVEL_ORDER.map((level) => (
              <div key={level} className={styles.mapLegendItem}>
                <span className={styles.mapLegendDot} style={{ background: LEVEL_COLORS[level] }} />
                <span>{t.level[level]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function DataPage({ t, language }) {
  const [articles, setArticles] = useState(ARTICLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchArticles('world', 'all');
        if (mounted) setArticles(fetched.length ? fetched : ARTICLES);
      } catch {
        if (mounted) {
          setArticles(ARTICLES);
          setError(t.common.fallbackError);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [t.common.fallbackError]);

  const onSort = useCallback((key) => {
    setSortKey((previousKey) => {
      if (previousKey === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        return previousKey;
      }
      setSortDirection('asc');
      return key;
    });
  }, []);

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return articles.filter((article) => {
      if (!query) return true;
      const content = normalizeText(`${article.titre} ${article.pays} ${article.source}`);
      return content.includes(query);
    });
  }, [articles, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let first = a[sortKey] ?? '';
      let second = b[sortKey] ?? '';
      if (sortKey === 'date') {
        first = new Date(first).getTime();
        second = new Date(second).getTime();
      } else {
        first = normalizeText(first);
        second = normalizeText(second);
      }
      if (first < second) return sortDirection === 'asc' ? -1 : 1;
      if (first > second) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const currentPage = Math.min(page, pageCount);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [currentPage, sorted]);

  const byTheme = useMemo(() => {
    const counts = { waste: 0, air: 0, water: 0, soil: 0 };
    for (const article of articles) {
      if (counts[article.theme] != null) counts[article.theme] += 1;
    }
    const max = Math.max(1, ...Object.values(counts));
    return THEME_ORDER.map((theme) => ({ theme, count: counts[theme], percent: Math.round((counts[theme] / max) * 100) }));
  }, [articles]);

  const columns = ['pays', 'theme', 'niveau', 'source', 'date'];

  return (
    <main className={styles.pageSection}>
      <h2 className={styles.pageTitle}>{t.dataPage.title}</h2>
      <input value={search} onChange={(event) => setSearch(event.target.value)} className={styles.searchInput} placeholder={t.dataPage.searchPlaceholder} />
      {loading ? <div className={styles.infoText}>{t.common.loading}</div> : null}
      {error ? <div className={styles.infoText}>{error}</div> : null}

      <div className={styles.dataGrid}>
        <section className={styles.dataTableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {columns.map((column) => {
                  const isActive = sortKey === column;
                  const arrow = isActive ? (sortDirection === 'asc' ? '↑' : '↓') : '↕';
                  return (
                    <th key={column}>
                      <button type='button' className={styles.sortButton} onClick={() => onSort(column)}>
                        {t.dataPage.tableHeaders[column]} {arrow}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paged.map((article) => (
                <tr key={article.id}>
                  <td>{article.pays}</td>
                  <td>{t.filters.themesList[article.theme] || article.theme}</td>
                  <td className={getLevelClassName(article.niveau)}>{t.level[article.niveau]}</td>
                  <td>{article.source}</td>
                  <td>{formatDate(article.date, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {paged.length === 0 ? <div className={styles.emptyState}>{t.noArticles}</div> : null}

          <div className={styles.paginationBar}>
            <button type='button' className={styles.pageButton} disabled={currentPage <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
              ‹
            </button>
            <span>
              {t.dataPage.page} {currentPage} / {pageCount}
            </span>
            <button type='button' className={styles.pageButton} disabled={currentPage >= pageCount} onClick={() => setPage((v) => Math.min(pageCount, v + 1))}>
              ›
            </button>
          </div>
        </section>

        <section className={styles.dataBarsWrap}>
          <h3 className={styles.sectionTitle}>{t.dataPage.byTheme}</h3>
          <div className={styles.themeBars}>
            {byTheme.map((item) => (
              <div key={item.theme} className={styles.themeBarRow}>
                <div className={styles.themeBarLabel}>{t.filters.themesList[item.theme]}</div>
                <div className={styles.themeBarTrack}>
                  <div className={styles.themeBarFill} style={{ width: `${item.percent}%` }} />
                </div>
                <div className={styles.themeBarCount}>{item.count}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function AlertsPage({ t, language }) {
  const [articles, setArticles] = useState(ARTICLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scraping, setScraping] = useState(false);

  const load = useCallback(async () => {
    const fetched = await fetchArticles('world', 'all');
    return fetched.length ? fetched : ARTICLES;
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await load();
        if (mounted) setArticles(fetched);
      } catch {
        if (mounted) {
          setArticles(ARTICLES);
          setError(t.common.fallbackError);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    const timeoutId = window.setTimeout(() => {
      run();
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [load, t.common.fallbackError]);

  const sorted = useMemo(() => [...articles].sort((a, b) => new Date(b.date) - new Date(a.date)), [articles]);
  const critical = useMemo(() => sorted.filter((article) => article.niveau === 'critique'), [sorted]);
  const high = useMemo(() => sorted.filter((article) => article.niveau === 'eleve'), [sorted]);

  const handleScrape = useCallback(async () => {
    setScraping(true);
    try {
      const response = await fetch(`${API_BASE}/scrape`, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await load();
    } catch {
      await load();
    } finally {
      setScraping(false);
    }
  }, [load]);

  return (
    <main className={styles.pageSection}>
      <div className={styles.alertsHeaderRow}>
        <h2 className={styles.pageTitle}>{t.alertsPage.title}</h2>
        <button type='button' className={styles.scrapeButton} onClick={handleScrape} disabled={scraping}>
          {scraping ? t.common.scrapingInProgress : t.common.triggerScrape}
        </button>
      </div>

      {loading ? <div className={styles.infoText}>{t.common.loading}</div> : null}
      {error ? <div className={styles.infoText}>{error}</div> : null}

      <section className={styles.alertsSection}>
        <h3 className={styles.sectionTitle}>{t.alertsPage.critical}</h3>
        <div className={styles.alertCards}>
          {critical.length > 0 ? (
            critical.map((article) => (
              <article key={article.id} className={`${styles.alertCard} ${styles.alertCardCritical}`}>
                <h4>{article.pays} — {article.titre}</h4>
                <div className={styles.articleMeta}>{article.source} · {formatDate(article.date, language)}</div>
                <p>{article.description}</p>
              </article>
            ))
          ) : (
            <div className={styles.emptyState}>{t.alertsPage.empty}</div>
          )}
        </div>
      </section>

      <section className={styles.alertsSection}>
        <h3 className={styles.sectionTitle}>{t.alertsPage.elevated}</h3>
        <div className={styles.alertCards}>
          {high.length > 0 ? (
            high.map((article) => (
              <article key={article.id} className={`${styles.alertCard} ${styles.alertCardHigh}`}>
                <h4>{article.pays} — {article.titre}</h4>
                <div className={styles.articleMeta}>{article.source} · {formatDate(article.date, language)}</div>
                <p>{article.description}</p>
              </article>
            ))
          ) : (
            <div className={styles.emptyState}>{t.alertsPage.empty}</div>
          )}
        </div>
      </section>

      <section className={styles.alertsSection}>
        <h3 className={styles.sectionTitle}>{t.alertsPage.history}</h3>
        <ul className={styles.historyList}>
          {sorted.map((article) => (
            <li key={article.id} className={styles.historyItem}>
              <span className={`${styles.historyBadge} ${getLevelClassName(article.niveau)}`}>{t.level[article.niveau]}</span>
              <span>{article.titre}</span>
              <span className={styles.historyMeta}>{article.pays} · {formatDate(article.date, language)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ReportsPage({ t, language }) {
  const [articles, setArticles] = useState(ARTICLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState('world');
  const [theme, setTheme] = useState('all');
  const [period, setPeriod] = useState('all');
  const [reportTitle, setReportTitle] = useState('Rapport Zürich');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [nowTs] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchArticles('world', 'all');
        if (mounted) setArticles(fetched.length ? fetched : ARTICLES);
      } catch {
        if (mounted) {
          setArticles(ARTICLES);
          setError(t.common.fallbackError);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [t.common.fallbackError]);

  const filtered = useMemo(() => {
    return articles.filter((article) => {
      const regionOk = region === 'world' || article.region === region;
      const themeOk = theme === 'all' || article.theme === theme;
      let periodOk = true;
      if (period === 'd7') periodOk = nowTs - new Date(article.date).getTime() <= 7 * 24 * 60 * 60 * 1000;
      if (period === 'd30') periodOk = nowTs - new Date(article.date).getTime() <= 30 * 24 * 60 * 60 * 1000;
      return regionOk && themeOk && periodOk;
    });
  }, [articles, nowTs, period, region, theme]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)), [filtered]);

  const summary = useMemo(() => {
    const countries = new Set(sorted.map((item) => item.pays));
    const sources = new Set(sorted.map((item) => item.source));
    const levels = { critique: 0, eleve: 0, modere: 0, info: 0 };
    for (const item of sorted) levels[item.niveau] += 1;
    return { count: sorted.length, countries: countries.size, sources: sources.size, levels };
  }, [sorted]);

  const buildMarkdown = useCallback(() => {
    const dateLabel = new Intl.DateTimeFormat(LOCALES[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
    const title = reportTitle || 'Rapport Zürich';
    const header = `# ${title}\n*${t.reportsPage.markdown.generatedBy} · ${dateLabel}*\n\n## ${t.reportsPage.markdown.summary}\n${summary.count} articles · ${summary.countries} pays · ${summary.sources} sources\n\n## ${t.reportsPage.markdown.articles}\n`;
    const body = sorted
      .map(
        (article) =>
          `### ${article.titre}\n**${t.source}** : ${article.source} | **${t.country}** : ${article.pays} | **${t.dataPage.tableHeaders.niveau}** : ${t.level[article.niveau]} | **${t.dataPage.tableHeaders.date}** : ${formatDate(article.date, language)}\n${article.description}\n---`
      )
      .join('\n');
    return `${header}${body}`;
  }, [language, reportTitle, sorted, summary.count, summary.countries, summary.sources, t]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopyFeedback(t.reportsPage.copied);
      window.setTimeout(() => setCopyFeedback(''), 1800);
    } catch {
      setCopyFeedback('Clipboard unavailable');
      window.setTimeout(() => setCopyFeedback(''), 1800);
    }
  }, [buildMarkdown, t.reportsPage.copied]);

  const handleExportCsv = useCallback(() => {
    const header = ['titre', 'source', 'pays', 'theme', 'niveau', 'date', 'description'];
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = sorted.map((article) => [article.titre, article.source, article.pays, article.theme, article.niveau, article.date, article.description].map(escape).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'zurich-report.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <main className={styles.pageSection}>
      <h2 className={styles.pageTitle}>{t.reportsPage.title}</h2>

      <section className={styles.reportFilters}>
        <label>
          <span>{t.reportsPage.region}</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {REGION_KEYS.map((key) => (
              <option key={key} value={key}>{t.filters.regionsList[key]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{t.reportsPage.theme}</span>
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            {THEME_KEYS.map((key) => (
              <option key={key} value={key}>{t.filters.themesList[key]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{t.reportsPage.period}</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value='d7'>{t.reportsPage.periods.d7}</option>
            <option value='d30'>{t.reportsPage.periods.d30}</option>
            <option value='all'>{t.reportsPage.periods.all}</option>
          </select>
        </label>

        <label className={styles.reportTitleInputWrap}>
          <span>{t.reportsPage.reportTitle}</span>
          <input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} />
        </label>
      </section>

      {loading ? <div className={styles.infoText}>{t.common.loading}</div> : null}
      {error ? <div className={styles.infoText}>{error}</div> : null}

      <section className={styles.reportPreview}>
        <h3 className={styles.sectionTitle}>{t.reportsPage.preview}</h3>
        <div className={styles.reportSummary}>
          <strong>{summary.count}</strong> {t.reportsPage.selectedArticles} · {summary.countries} {t.country.toLowerCase()} · {summary.sources} {t.source.toLowerCase()}
        </div>

        <div className={styles.levelDistribution}>
          <span>{t.reportsPage.distribution}</span>
          {LEVEL_ORDER.map((level) => (
            <span key={level} className={`${styles.historyBadge} ${getLevelClassName(level)}`}>
              {t.level[level]}: {summary.levels[level]}
            </span>
          ))}
        </div>

        <div className={styles.reportArticlesList}>
          {sorted.map((article) => (
            <article key={article.id} className={styles.reportArticleItem}>
              <h4>{article.titre}</h4>
              <div className={styles.articleMeta}>
                <span>{t.source}: {article.source}</span>
                <span>·</span>
                <span>{t.country}: {article.pays}</span>
                <span>·</span>
                <span className={getLevelClassName(article.niveau)}>{t.level[article.niveau]}</span>
                <span>·</span>
                <span>{formatDate(article.date, language)}</span>
              </div>
              <p>{article.description}</p>
            </article>
          ))}
        </div>

        <div className={styles.reportActions}>
          <button type='button' className={styles.exportButton} onClick={handleCopy}>{t.reportsPage.copyMarkdown}</button>
          <button type='button' className={styles.exportButton} onClick={handleExportCsv}>{t.reportsPage.exportCsv}</button>
          {copyFeedback ? <span className={styles.copyFeedback}>{copyFeedback}</span> : null}
        </div>
      </section>
    </main>
  );
}

function getImageParDefaut(theme) {
  const images = {
    waste: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" fill="#f5f5f5"/><g fill="#888888"><rect x="8" y="8" width="24" height="22" rx="1"/><path d="M10 8V6h20v2M15 8V4h10v4"/></g></svg>',
    air: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" fill="#f5f5f5"/><g fill="#888888"><circle cx="20" cy="12" r="4"/><path d="M8 20c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M8 28c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/></g></svg>',
    water: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" fill="#f5f5f5"/><g fill="#888888"><path d="M20 6c-3 4-6 8-6 12 0 3.3 2.7 6 6 6s6-2.7 6-6c0-4-3-8-6-12z"/><path d="M12 28c2-1.5 4-2 8-2s6 0.5 8 2"/></g></svg>',
    soil: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" fill="#f5f5f5"/><g fill="#888888"><ellipse cx="20" cy="22" rx="12" ry="8" opacity="0.6"/><path d="M12 18c1-2 3-4 8-4s7 2 8 4"/><path d="M18 12c0-1 1-2 2-2s2 1 2 2"/></g></svg>',
    default: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" fill="#f5f5f5"/><g fill="#888888"><circle cx="20" cy="18" r="4"/><path d="M8 30l5-8 4 3 6-10 7 15H8z"/></g></svg>'
  };
  return images[theme] || images.default;
}

function LecteurArticle({ article, onFermer }) {
  const [iframeBlocked, setIframeBlocked] = useState(false);

  if (!article) return null;

  return (
    <div className={styles.lecteurOverlay}>
      <div className={styles.lecteurHeader}>
        <div className={styles.lecteurMeta}>
          <span className={styles.lecteurSource}>{article.source}</span>
          <span className={styles.lecteurTitre}>{article.titre}</span>
        </div>
        <div className={styles.lecteurActions}>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.lecteurExterne}
            >
              ↗ Ouvrir dans un nouvel onglet
            </a>
          )}
          <button onClick={onFermer} className={styles.lecteurFermer}>
            ✕ Fermer
          </button>
        </div>
      </div>
      {iframeBlocked || !article.url ? (
        <div className={styles.lecteurBloque}>
          <p>
            Ce site ne permet pas l'affichage intégré.
          </p>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.lecteurExterne}
            >
              ↗ Lire l'article sur {article.source}
            </a>
          )}
        </div>
      ) : (
        <iframe
          src={article.url}
          className={styles.lecteurIframe}
          title={article.titre}
          sandbox="allow-scripts allow-same-origin allow-popups"
          onError={() => setIframeBlocked(true)}
        />
      )}
    </div>
  );
}

function App() {
  const [language, setLanguage] = useState('fr');
  const [activeSection, setActiveSection] = useState(() => getSectionFromPath(window.location.pathname));
  const [selectedRegion, setSelectedRegion] = useState('world');
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [minutesToRefresh, setMinutesToRefresh] = useState(185);
  const [articles, setArticles] = useState(ARTICLES);
  const [stats, setStats] = useState(GLOBAL_STATS);
  const [alerts, setAlerts] = useState(ACTIVE_ALERTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [articleOuvert, setArticleOuvert] = useState(null);

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMinutesToRefresh((previousMinutes) => (previousMinutes <= 1 ? 185 : previousMinutes - 1));
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const onPopState = () => setActiveSection(getSectionFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    // Ping keep-alive toutes les 14 minutes pour garder Render éveillé
    const keepAlive = setInterval(() => {
      fetch(`${API_BASE}/health`, { method: 'GET' })
        .catch(() => {}) // Ignorer les erreurs silencieusement
    }, 14 * 60 * 1000) // 14 minutes

    return () => clearInterval(keepAlive)
  }, []);

  const handleSectionChange = useCallback((section) => {
    const nextPath = getPathFromSection(section);
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath);
    setActiveSection(section);
  }, []);

  const loadArticles = useCallback(async (region, theme) => {
    setLoading(true);
    setError(null);
    try {
      const apiArticles = await fetchArticles(region, theme);
      setArticles(apiArticles.length ? apiArticles : ARTICLES);
    } catch {
      setArticles(ARTICLES);
      setError(t.common.fallbackError);
    } finally {
      setLoading(false);
    }
  }, [t.common.fallbackError]);

  const loadSidebarData = useCallback(async () => {
    try {
      const [apiStats, apiAlerts] = await Promise.all([fetchStats(), fetchAlerts()]);
      setStats(apiStats);
      setAlerts(apiAlerts.length ? apiAlerts : ACTIVE_ALERTS);
    } catch {
      setStats(GLOBAL_STATS);
      setAlerts(ACTIVE_ALERTS);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadArticles(selectedRegion, selectedTheme);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadArticles, selectedRegion, selectedTheme]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadSidebarData();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSidebarData]);

  const handleRefresh = useCallback(async () => {
    setScraping(true);
    try {
      await fetch(`${API_BASE}/scrape`, { method: 'POST' });
      await loadArticles(selectedRegion, selectedTheme);
      await loadSidebarData();
    } catch {
      await loadArticles(selectedRegion, selectedTheme);
    } finally {
      setScraping(false);
    }
  }, [loadArticles, loadSidebarData, selectedRegion, selectedTheme]);

  const sortedArticles = useMemo(() => [...articles].sort((a, b) => new Date(b.date) - new Date(a.date)), [articles]);

  const filteredArticles = useMemo(() => {
    return sortedArticles.filter((article) => {
      const matchesRegion = selectedRegion === 'world' || article.region === selectedRegion;
      const matchesTheme = selectedTheme === 'all' || article.theme === selectedTheme;
      return matchesRegion && matchesTheme;
    });
  }, [selectedRegion, selectedTheme, sortedArticles]);

  const criticalArticles = useMemo(() => sortedArticles.filter((article) => article.niveau === 'critique').slice(0, 6), [sortedArticles]);

  const sourceCount = useMemo(() => {
    const sources = filteredArticles.map((article) => article.source);
    const uniqueSourceCount = new Set(sources).size;
    return uniqueSourceCount > 0 ? uniqueSourceCount : new Set(articles.map((article) => article.source)).size;
  }, [articles, filteredArticles]);

  const topArticle = filteredArticles[0] || null;
  const listArticles = filteredArticles.slice(1);
  const refreshHours = Math.floor(minutesToRefresh / 60);
  const refreshMinutes = minutesToRefresh % 60;

  return (
    <div className={styles.app} dir={isRtl ? 'rtl' : 'ltr'}>
      <Header t={t} activeSection={activeSection} onSectionChange={handleSectionChange} language={language} onLanguageChange={setLanguage} />

      {activeSection === 'actualites' ? (
        <NewsroomPage
          t={t}
          language={language}
          selectedRegion={selectedRegion}
          selectedTheme={selectedTheme}
          onRegionChange={setSelectedRegion}
          onThemeChange={setSelectedTheme}
          topArticle={topArticle}
          listArticles={listArticles}
          criticalArticles={criticalArticles}
          stats={stats}
          alerts={alerts}
          loading={loading}
          error={error}
          onOpenArticle={setArticleOuvert}
        />
      ) : null}

      {activeSection === 'carte' ? <MapPage t={t} /> : null}
      {activeSection === 'donnees' ? <DataPage t={t} language={language} /> : null}
      {activeSection === 'alertes' ? <AlertsPage t={t} language={language} /> : null}
      {activeSection === 'rapports' ? <ReportsPage t={t} language={language} /> : null}

      {articleOuvert && (
        <LecteurArticle
          article={articleOuvert}
          onFermer={() => setArticleOuvert(null)}
        />
      )}

      <footer className={styles.footer}>
        {t.footer(refreshHours, refreshMinutes, sourceCount)}{' '}
        <button type='button' onClick={handleRefresh} disabled={scraping} className={styles.refreshButton}>
          {scraping ? t.common.scrapingInProgress : '↺ Actualiser'}
        </button>
      </footer>
    </div>
  );
}

export default App;
