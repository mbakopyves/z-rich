import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './App.module.css';

const NAV_ITEMS = ['actualites', 'carte', 'donnees', 'alertes', 'rapports'];
const REGION_KEYS = ['world', 'africa', 'asia', 'americas', 'europe', 'oceania'];
const THEME_KEYS = ['all', 'waste', 'air', 'water', 'soil'];
const LANGUAGE_CODES = ['fr', 'en', 'es', 'ar'];
const API_BASE = 'http://localhost:5000/api';

const TRANSLATIONS = {
  fr: {
    languageLabel: 'Langue',
    subtitle: "Veille mondiale · insalubrité & pollution",
    navAria: 'Navigation principale',
    nav: {
      actualites: 'Actualités',
      carte: 'Carte',
      donnees: 'Données',
      alertes: 'Alertes',
      rapports: 'Rapports'
    },
    filters: {
      regions: 'Régions',
      themes: 'Thèmes',
      regionsList: {
        world: 'Monde',
        africa: 'Afrique',
        asia: 'Asie',
        americas: 'Amériques',
        europe: 'Europe',
        oceania: 'Océanie'
      },
      themesList: {
        all: 'Tous',
        waste: 'Déchets',
        air: 'Air',
        water: 'Eau',
        soil: 'Sols'
      }
    },
    featured: 'À la une',
    latest: 'Dernières dépêches',
    source: 'Source',
    country: 'Pays',
    globalIndicators: 'Indicateurs mondiaux',
    stats: {
      pollutionIndex: 'Indice pollution',
      criticalZones: 'Zones critiques',
      countriesCovered: 'Pays couverts',
      articles24h: 'Articles / 24h'
    },
    activeAlerts: 'Alertes actives',
    topics: 'Thèmes',
    export: 'Export',
    exportButtons: {
      pdf: 'PDF',
      csv: 'CSV',
      link: 'Lien'
    },
    level: {
      critique: 'Critique',
      eleve: 'Élevé',
      modere: 'Modéré',
      info: 'Info'
    },
    noCriticalAlerts: 'Aucune alerte critique en cours',
    noArticles: 'Aucun article ne correspond aux filtres sélectionnés.',
    placeholders: {
      carte: 'La section Carte sera connectée aux flux géospatiaux et à la cartographie des zones critiques.',
      donnees: 'La section Données regroupera les séries, tableaux et comparateurs pour les analystes.',
      alertes: 'La section Alertes présentera les seuils, notifications et priorités de surveillance.',
      rapports: 'La section Rapports rassemblera les synthèses exportables pour ONG et commanditaires.'
    },
    footer: (hours, minutes, sources) =>
      `Prochaine actualisation dans ${hours}h ${minutes}min · ${sources} sources actives`
  },
  en: {
    languageLabel: 'Language',
    subtitle: 'Global monitoring · unsanitary conditions & pollution',
    navAria: 'Main navigation',
    nav: {
      actualites: 'News',
      carte: 'Map',
      donnees: 'Data',
      alertes: 'Alerts',
      rapports: 'Reports'
    },
    filters: {
      regions: 'Regions',
      themes: 'Topics',
      regionsList: {
        world: 'World',
        africa: 'Africa',
        asia: 'Asia',
        americas: 'Americas',
        europe: 'Europe',
        oceania: 'Oceania'
      },
      themesList: {
        all: 'All',
        waste: 'Waste',
        air: 'Air',
        water: 'Water',
        soil: 'Soil'
      }
    },
    featured: 'Top story',
    latest: 'Latest dispatches',
    source: 'Source',
    country: 'Country',
    globalIndicators: 'Global indicators',
    stats: {
      pollutionIndex: 'Pollution index',
      criticalZones: 'Critical zones',
      countriesCovered: 'Countries covered',
      articles24h: 'Articles / 24h'
    },
    activeAlerts: 'Active alerts',
    topics: 'Topics',
    export: 'Export',
    exportButtons: {
      pdf: 'PDF',
      csv: 'CSV',
      link: 'Link'
    },
    level: {
      critique: 'Critical',
      eleve: 'High',
      modere: 'Moderate',
      info: 'Info'
    },
    noCriticalAlerts: 'No critical alert at the moment',
    noArticles: 'No article matches the selected filters.',
    placeholders: {
      carte: 'The Map section will connect geospatial feeds and critical-zone mapping.',
      donnees: 'The Data section will host datasets, tables, and comparison tools for analysts.',
      alertes: 'The Alerts section will display thresholds, notifications, and monitoring priorities.',
      rapports: 'The Reports section will compile export-ready summaries for NGOs and sponsors.'
    },
    footer: (hours, minutes, sources) =>
      `Next refresh in ${hours}h ${minutes}min · ${sources} active sources`
  },
  es: {
    languageLabel: 'Idioma',
    subtitle: 'Vigilancia mundial · insalubridad y contaminación',
    navAria: 'Navegación principal',
    nav: {
      actualites: 'Actualidad',
      carte: 'Mapa',
      donnees: 'Datos',
      alertes: 'Alertas',
      rapports: 'Informes'
    },
    filters: {
      regions: 'Regiones',
      themes: 'Temas',
      regionsList: {
        world: 'Mundo',
        africa: 'África',
        asia: 'Asia',
        americas: 'Américas',
        europe: 'Europa',
        oceania: 'Oceanía'
      },
      themesList: {
        all: 'Todos',
        waste: 'Residuos',
        air: 'Aire',
        water: 'Agua',
        soil: 'Suelos'
      }
    },
    featured: 'En portada',
    latest: 'Últimos cables',
    source: 'Fuente',
    country: 'País',
    globalIndicators: 'Indicadores globales',
    stats: {
      pollutionIndex: 'Índice de contaminación',
      criticalZones: 'Zonas críticas',
      countriesCovered: 'Países cubiertos',
      articles24h: 'Artículos / 24h'
    },
    activeAlerts: 'Alertas activas',
    topics: 'Temas',
    export: 'Exportar',
    exportButtons: {
      pdf: 'PDF',
      csv: 'CSV',
      link: 'Enlace'
    },
    level: {
      critique: 'Crítica',
      eleve: 'Alta',
      modere: 'Moderada',
      info: 'Info'
    },
    noCriticalAlerts: 'No hay alerta crítica en curso',
    noArticles: 'Ningún artículo coincide con los filtros seleccionados.',
    placeholders: {
      carte: 'La sección Mapa conectará los flujos geoespaciales y el mapeo de zonas críticas.',
      donnees: 'La sección Datos reunirá series, tablas y comparadores para analistas.',
      alertes: 'La sección Alertas mostrará umbrales, notificaciones y prioridades de vigilancia.',
      rapports: 'La sección Informes agrupará resúmenes exportables para ONG y patrocinadores.'
    },
    footer: (hours, minutes, sources) =>
      `Próxima actualización en ${hours}h ${minutes}min · ${sources} fuentes activas`
  },
  ar: {
    languageLabel: 'اللغة',
    subtitle: 'مراقبة عالمية · التلوث والبيئات غير الصحية',
    navAria: 'التنقل الرئيسي',
    nav: {
      actualites: 'الأخبار',
      carte: 'الخريطة',
      donnees: 'البيانات',
      alertes: 'التنبيهات',
      rapports: 'التقارير'
    },
    filters: {
      regions: 'المناطق',
      themes: 'المحاور',
      regionsList: {
        world: 'العالم',
        africa: 'أفريقيا',
        asia: 'آسيا',
        americas: 'الأمريكيتان',
        europe: 'أوروبا',
        oceania: 'أوقيانوسيا'
      },
      themesList: {
        all: 'الكل',
        waste: 'النفايات',
        air: 'الهواء',
        water: 'المياه',
        soil: 'التربة'
      }
    },
    featured: 'العنوان الأبرز',
    latest: 'آخر التقارير',
    source: 'المصدر',
    country: 'الدولة',
    globalIndicators: 'المؤشرات العالمية',
    stats: {
      pollutionIndex: 'مؤشر التلوث',
      criticalZones: 'المناطق الحرجة',
      countriesCovered: 'الدول المغطاة',
      articles24h: 'مقالات / 24 ساعة'
    },
    activeAlerts: 'التنبيهات النشطة',
    topics: 'المحاور',
    export: 'تصدير',
    exportButtons: {
      pdf: 'PDF',
      csv: 'CSV',
      link: 'رابط'
    },
    level: {
      critique: 'حرج',
      eleve: 'مرتفع',
      modere: 'متوسط',
      info: 'معلومة'
    },
    noCriticalAlerts: 'لا توجد تنبيهات حرجة حالياً',
    noArticles: 'لا توجد مقالات مطابقة للفلاتر المحددة.',
    placeholders: {
      carte: 'سيتم ربط قسم الخريطة بتدفقات البيانات الجغرافية ومناطق الخطر.',
      donnees: 'سيجمع قسم البيانات الجداول والمؤشرات والمقارنات للمحللين.',
      alertes: 'سيعرض قسم التنبيهات العتبات والإشعارات وأولويات المراقبة.',
      rapports: 'سيجمع قسم التقارير ملخصات قابلة للتصدير للمنظمات والشركاء.'
    },
    footer: (hours, minutes, sources) =>
      `التحديث القادم خلال ${hours}س ${minutes}د · ${sources} مصادر نشطة`
  }
};

const ARTICLES = [
  {
    id: 'news-001',
    titre: 'Toxic ash migration detected across three shipping corridors',
    description:
      'Satellite and port inspections confirm illegal ash transfers between coastal terminals, raising public-health concerns in densely populated harbors.',
    source: 'Reuters',
    region: 'world',
    theme: 'waste',
    date: '2026-04-26T10:42:00Z',
    niveau: 'critique',
    pays: 'Multiple countries',
    imageUrl: null
  },
  {
    id: 'news-002',
    titre: 'Contaminación del agua obliga cierres temporales en puertos del Caribe',
    description:
      'Nuevos análisis detectan niveles de hidrocarburos por encima de los límites recomendados en zonas de pesca artesanal.',
    source: 'Agencia EFE',
    region: 'americas',
    theme: 'water',
    date: '2026-04-26T09:58:00Z',
    niveau: 'eleve',
    pays: 'República Dominicana',
    imageUrl: null
  },
  {
    id: 'news-003',
    titre: 'Décharges ouvertes: hausse de particules fines dans deux capitales sahéliennes',
    description:
      'Des mesures indépendantes indiquent une hausse marquée des PM2.5 autour de sites de brûlage informel de déchets ménagers.',
    source: 'Le Monde Afrique',
    region: 'africa',
    theme: 'air',
    date: '2026-04-26T09:20:00Z',
    niveau: 'critique',
    pays: 'Niger',
    imageUrl: null
  },
  {
    id: 'news-004',
    titre: 'Riverbank cleanup delayed as heavy metal readings remain unstable',
    description:
      'Environmental labs warn that remediation targets are slipping as cadmium concentration fluctuates after seasonal flooding.',
    source: 'BBC World',
    region: 'europe',
    theme: 'water',
    date: '2026-04-26T08:40:00Z',
    niveau: 'modere',
    pays: 'Romania',
    imageUrl: null
  },
  {
    id: 'news-005',
    titre: 'تسرب نفايات صناعية قرب مجرى نهري يثير احتجاجات محلية',
    description:
      'أكدت فرق الرصد البيئي وجود مخلفات كيميائية في محيط مواقع تصنيع غير ملتزمة بمعايير السلامة.',
    source: 'Al Jazeera',
    region: 'asia',
    theme: 'waste',
    date: '2026-04-26T08:10:00Z',
    niveau: 'eleve',
    pays: 'Iraq',
    imageUrl: null
  },
  {
    id: 'news-006',
    titre: 'Plastics leakage index worsens in South Pacific shipping lanes',
    description:
      'Audit reports show microplastic concentration spikes near high-traffic maritime routes and informal dumping points.',
    source: 'Reuters',
    region: 'oceania',
    theme: 'waste',
    date: '2026-04-26T07:46:00Z',
    niveau: 'modere',
    pays: 'Fiji',
    imageUrl: null
  },
  {
    id: 'news-007',
    titre: 'Indice global de pollution atmosphérique: 12 mégapoles en vigilance élevée',
    description:
      "La dernière consolidation des capteurs urbains confirme une aggravation continue de l'exposition sur les grands axes logistiques.",
    source: 'AFP',
    region: 'world',
    theme: 'air',
    date: '2026-04-26T07:20:00Z',
    niveau: 'eleve',
    pays: 'Global',
    imageUrl: null
  },
  {
    id: 'news-008',
    titre: 'Incendios en vertederos ilegales elevan riesgos sanitarios en la periferia',
    description:
      'Organizaciones comunitarias denuncian la falta de planes de contingencia y evacuación para barrios cercanos.',
    source: 'El País',
    region: 'americas',
    theme: 'air',
    date: '2026-04-26T06:52:00Z',
    niveau: 'critique',
    pays: 'Perú',
    imageUrl: null
  },
  {
    id: 'news-009',
    titre: 'Groundwater nitrate alerts extended across major farming districts',
    description:
      'A joint bulletin urges local authorities to monitor wells as nitrate concentrations exceed seasonal norms.',
    source: 'Financial Times',
    region: 'europe',
    theme: 'soil',
    date: '2026-04-26T06:10:00Z',
    niveau: 'info',
    pays: 'Spain',
    imageUrl: null
  },
  {
    id: 'news-010',
    titre: 'Accumulation de déchets électroniques dans les zones portuaires d’Afrique de l’Ouest',
    description:
      'Les contrôles douaniers signalent une hausse des arrivages non conformes, avec des filières de recyclage insuffisantes.',
    source: 'Mongabay',
    region: 'africa',
    theme: 'waste',
    date: '2026-04-26T05:34:00Z',
    niveau: 'modere',
    pays: 'Ghana',
    imageUrl: null
  },
  {
    id: 'news-011',
    titre: 'Coastal sediments show elevated mercury levels after storm season',
    description:
      'Lab teams documented persistent contamination pockets near estuaries that supply nearby urban districts.',
    source: 'The Guardian',
    region: 'asia',
    theme: 'soil',
    date: '2026-04-26T04:58:00Z',
    niveau: 'eleve',
    pays: 'Indonesia',
    imageUrl: null
  },
  {
    id: 'news-012',
    titre: 'Oceania health monitors report stable air quality despite wildfire smoke',
    description:
      'Public agencies observed short-lived peaks, but overall exposure remained within emergency thresholds.',
    source: 'ABC Pacific',
    region: 'oceania',
    theme: 'air',
    date: '2026-04-26T03:41:00Z',
    niveau: 'info',
    pays: 'Australia',
    imageUrl: null
  }
];

const GLOBAL_STATS = {
  pollutionIndex: '72/100',
  criticalZones: '49',
  countriesCovered: '132',
  articles24h: '287'
};

const ACTIVE_ALERTS = [
  {
    id: 'alert-1',
    niveau: 'critique',
    message: {
      fr: 'Rejets toxiques multipoints dans le corridor atlantique.',
      en: 'Multi-point toxic discharge in the Atlantic corridor.',
      es: 'Vertidos tóxicos en múltiples puntos del corredor atlántico.',
      ar: 'تصريف سام متعدد النقاط في الممر الأطلسي.'
    }
  },
  {
    id: 'alert-2',
    niveau: 'eleve',
    message: {
      fr: "Hausse durable des PM2.5 autour de plusieurs zones d'enfouissement.",
      en: 'Sustained PM2.5 increase around multiple landfill zones.',
      es: 'Aumento sostenido de PM2.5 alrededor de varios vertederos.',
      ar: 'ارتفاع مستمر في PM2.5 حول عدة مناطق طمر نفايات.'
    }
  },
  {
    id: 'alert-3',
    niveau: 'critique',
    message: {
      fr: "Pollution de l'eau confirmée sur trois bassins d'approvisionnement.",
      en: 'Water contamination confirmed in three supply basins.',
      es: 'Contaminación del agua confirmada en tres cuencas de abastecimiento.',
      ar: 'تلوث المياه مؤكد في ثلاثة أحواض إمداد.'
    }
  }
];

const LOCALES = {
  fr: 'fr-FR',
  en: 'en-GB',
  es: 'es-ES',
  ar: 'ar-EG'
};

function getLevelClassName(level) {
  if (level === 'critique') return styles.levelCritique;
  if (level === 'eleve') return styles.levelEleve;
  if (level === 'modere') return styles.levelModere;
  return styles.levelInfo;
}

function formatDate(dateIso, language) {
  const parsedDate = new Date(dateIso);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateIso;
  }
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsedDate);
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
          <select
            className={styles.languageSelect}
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            aria-label={t.languageLabel}
          >
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
          <button
            key={item}
            type='button'
            className={`${styles.navButton} ${activeSection === item ? styles.navButtonActive : ''}`}
            onClick={() => onSectionChange(item)}
          >
            {t.nav[item]}
          </button>
        ))}
      </nav>
    </header>
  );
}

function TickerBar({ articles, t }) {
  const tickerText = useMemo(() => {
    if (!articles.length) {
      return t.noCriticalAlerts;
    }

    return articles
      .map((article) => `${t.level[article.niveau]} — ${article.titre}`)
      .join('  •  ');
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
            <button
              key={region}
              type='button'
              className={`${styles.chip} ${selectedRegion === region ? styles.chipActive : ''}`}
              onClick={() => onRegionChange(region)}
            >
              {t.filters.regionsList[region]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t.filters.themes}</span>
        <div className={styles.chips}>
          {THEME_KEYS.map((theme) => (
            <button
              key={theme}
              type='button'
              className={`${styles.chip} ${selectedTheme === theme ? styles.chipActive : ''}`}
              onClick={() => onThemeChange(theme)}
            >
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
    return (
      <img
        className={`${styles.articleImage} ${large ? styles.articleImageLarge : styles.articleImageSmall}`}
        src={article.imageUrl}
        alt={article.titre}
      />
    );
  }

  return (
    <div
      className={`${styles.imagePlaceholder} ${large ? styles.articleImageLarge : styles.articleImageSmall}`}
      aria-hidden='true'
    >
      photo
    </div>
  );
}

function ArticleTop({ article, t, language }) {
  if (!article) {
    return <div className={styles.emptyState}>{t.noArticles}</div>;
  }

  const levelClassName = getLevelClassName(article.niveau);

  return (
    <article className={styles.articleTop}>
      <div className={styles.articleTopContent}>
        <p className={styles.articleBlockTitle}>{t.featured}</p>
        <span className={`${styles.alertBadge} ${levelClassName}`}>{t.level[article.niveau]}</span>
        <h2 className={styles.articleTopTitle}>{article.titre}</h2>
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

function ArticleRow({ article, t, language }) {
  const levelClassName = getLevelClassName(article.niveau);

  return (
    <article className={styles.articleRow}>
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
            <li
              key={alertItem.id}
              className={`${styles.alertItem} ${alertItem.niveau === 'critique' ? styles.alertItemCritical : styles.alertItemElevated}`}
            >
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
              <button
                type='button'
                className={`${styles.themeButton} ${activeTheme === theme ? styles.themeButtonActive : ''}`}
                onClick={() => onThemeClick(theme)}
              >
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

function NewsroomPage({
  t,
  language,
  selectedRegion,
  selectedTheme,
  onRegionChange,
  onThemeChange,
  topArticle,
  listArticles,
  criticalArticles,
  stats,
  alerts,
  loading,
  error
}) {
  return (
    <main className={styles.newsroomPage}>
      <TickerBar articles={criticalArticles} t={t} />

      <FilterBar
        t={t}
        selectedRegion={selectedRegion}
        selectedTheme={selectedTheme}
        onRegionChange={onRegionChange}
        onThemeChange={onThemeChange}
      />

      <section className={styles.newsroomLayout}>
        <div className={styles.feedColumn}>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>Chargement...</div>
          ) : null}
          {error ? (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              {error}
            </div>
          ) : null}
          <ArticleTop article={topArticle} t={t} language={language} />

          <h4 className={styles.feedTitle}>{t.latest}</h4>
          <div className={styles.articleRows}>
            {listArticles.length > 0 ? (
              listArticles.map((article) => (
                <ArticleRow key={article.id} article={article} t={t} language={language} />
              ))
            ) : (
              <div className={styles.emptyState}>{t.noArticles}</div>
            )}
          </div>
        </div>

        <Sidebar
          t={t}
          language={language}
          activeTheme={selectedTheme}
          onThemeClick={onThemeChange}
          stats={stats}
          alerts={alerts}
        />
      </section>
    </main>
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <main className={styles.placeholderPage}>
      <h2 className={styles.placeholderTitle}>{title}</h2>
      <p className={styles.placeholderText}>{description}</p>
    </main>
  );
}

function App() {
  const [language, setLanguage] = useState('fr');
  const [activeSection, setActiveSection] = useState('actualites');
  const [selectedRegion, setSelectedRegion] = useState('world');
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [minutesToRefresh, setMinutesToRefresh] = useState(185);
  const [articles, setArticles] = useState(ARTICLES);
  const [stats, setStats] = useState(GLOBAL_STATS);
  const [alerts, setAlerts] = useState(ACTIVE_ALERTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scraping, setScraping] = useState(false);

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

  const fetchArticles = useCallback(async (region, theme) => {
    const query = new URLSearchParams();
    if (region && region !== 'world') {
      query.set('region', region);
    }
    if (theme && theme !== 'all') {
      query.set('theme', theme);
    }
    query.set('limit', '50');

    const response = await fetch(`${API_BASE}/articles?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    return Array.isArray(payload.articles) ? payload.articles : [];
  }, []);

  const fetchStats = useCallback(async () => {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    return {
      pollutionIndex:
        typeof payload.pollution_index === 'number' ? `${Math.round(payload.pollution_index)}/100` : GLOBAL_STATS.pollutionIndex,
      criticalZones:
        payload.critical_zones != null ? String(payload.critical_zones) : GLOBAL_STATS.criticalZones,
      countriesCovered:
        payload.countries_covered != null ? String(payload.countries_covered) : GLOBAL_STATS.countriesCovered,
      articles24h:
        payload.articles_24h != null ? String(payload.articles_24h) : GLOBAL_STATS.articles24h
    };
  }, []);

  const fetchAlerts = useCallback(async () => {
    const response = await fetch(`${API_BASE}/alerts`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const apiAlerts = Array.isArray(payload.alerts) ? payload.alerts : [];
    return apiAlerts.map((alertItem) => ({
      id: alertItem.id,
      niveau: alertItem.niveau,
      description: alertItem.description,
      message: {
        fr: alertItem.description,
        en: alertItem.description,
        es: alertItem.description,
        ar: alertItem.description
      }
    }));
  }, []);

  const loadArticles = useCallback(
    async (region, theme) => {
      setLoading(true);
      setError(null);
      try {
        const apiArticles = await fetchArticles(region, theme);
        setArticles(apiArticles);
      } catch {
        setArticles(ARTICLES);
        setError('Impossible de charger les articles en direct. Données locales affichées.');
      } finally {
        setLoading(false);
      }
    },
    [fetchArticles]
  );

  const loadSidebarData = useCallback(async () => {
    try {
      const [apiStats, apiAlerts] = await Promise.all([fetchStats(), fetchAlerts()]);
      setStats(apiStats);
      setAlerts(apiAlerts);
    } catch {
      setStats(GLOBAL_STATS);
      setAlerts(ACTIVE_ALERTS);
    }
  }, [fetchAlerts, fetchStats]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadArticles(selectedRegion, selectedTheme);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedRegion, selectedTheme, loadArticles]);

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
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      await loadArticles(selectedRegion, selectedTheme);
      await loadSidebarData();
    } catch {
      await loadArticles(selectedRegion, selectedTheme);
    } finally {
      setScraping(false);
    }
  }, [loadArticles, loadSidebarData, selectedRegion, selectedTheme]);

  const sortedArticles = useMemo(() => {
    return [...articles].sort((firstArticle, secondArticle) => {
      return new Date(secondArticle.date) - new Date(firstArticle.date);
    });
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return sortedArticles.filter((article) => {
      const matchesRegion = selectedRegion === 'world' || article.region === selectedRegion;
      const matchesTheme = selectedTheme === 'all' || article.theme === selectedTheme;
      return matchesRegion && matchesTheme;
    });
  }, [selectedRegion, selectedTheme, sortedArticles]);

  const criticalArticles = useMemo(() => {
    return sortedArticles.filter((article) => article.niveau === 'critique').slice(0, 6);
  }, [sortedArticles]);

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
      <Header
        t={t}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        language={language}
        onLanguageChange={setLanguage}
      />

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
        />
      ) : (
        <PlaceholderPage title={t.nav[activeSection]} description={t.placeholders[activeSection]} />
      )}

      <footer className={styles.footer}>
        {t.footer(refreshHours, refreshMinutes, sourceCount)}{' '}
        <button
          type='button'
          onClick={handleRefresh}
          disabled={scraping}
          style={{
            marginLeft: '8px',
            border: '1px solid #cfcfcf',
            background: '#fff',
            color: '#222',
            fontSize: '12px',
            padding: '4px 8px',
            cursor: scraping ? 'not-allowed' : 'pointer'
          }}
        >
          {scraping ? 'Scraping...' : '↺ Actualiser'}
        </button>
      </footer>
    </div>
  );
}

export default App;
