/* ============================================================
   Lives of Faith — app.js
   Handles: data loading, card rendering, search/filter,
            person page rendering, clipboard copy.
   ============================================================ */

const DATA_URL = 'data/people.json';
const STORY_PREF_KEY = 'preferred-story-version';

let allPeople = [];
let randomOrder = [];

const filterState = {
  search: '',
  topic: '',
  hymn: '',
  region: '',
  era: '',
  reviewed: '',
  sort: 'random',
};

// ============================================================
// Utilities
// ============================================================

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 3)
    .join('');
}

function formatYears(person) {
  const born = person.born_approximate ? `c. ${person.born}` : String(person.born);
  const died = person.died ? String(person.died) : 'present';
  return `${born}–${died}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function storyToHtml(text) {
  return text
    .split(/\n\n+/)
    .map(para => {
      const parts = para.trim().split(/(\[\[[^\]]+\|[^\]]+\]\])/g);
      const html = parts.map(part => {
        const m = part.match(/^\[\[([^\]]+)\|([^\]]+)\]\]$/);
        if (m) {
          return `<a href="person.html?id=${escapeHtml(m[2])}" class="person-link">${escapeHtml(m[1])}</a>`;
        }
        return escapeHtml(part);
      }).join('');
      return `<p>${html}</p>`;
    })
    .join('\n');
}

function stripLinks(text) {
  return text.replace(/\[\[([^\]]+)\|[^\]]+\]\]/g, '$1');
}

function reviewBadgeHtml(person) {
  if (person.review.human_reviewed) {
    const by = person.review.reviewed_by ? ` by ${escapeHtml(person.review.reviewed_by)}` : '';
    return `<span class="badge badge-reviewed" title="Reviewed${by}">&#10003; Reviewed for accuracy</span>`;
  }
  return `<span class="badge badge-unreviewed">&#9888; AI-generated — not yet human reviewed</span>`;
}

// ============================================================
// Story version preference (localStorage)
// ============================================================

function getStoryVersion() {
  return localStorage.getItem(STORY_PREF_KEY) || 'adult';
}

function setStoryVersion(v) {
  localStorage.setItem(STORY_PREF_KEY, v);
}

// ============================================================
// Image attribution
// ============================================================

function buildAttributionHtml(image) {
  if (!image) return '';
  const parts = [];
  if (image.author) parts.push(escapeHtml(image.author));
  if (image.year) parts.push(escapeHtml(image.year));
  if (image.license) parts.push(escapeHtml(image.license));
  const text = parts.join(', ');
  if (text) {
    if (image.source_url) {
      return `<a href="${escapeHtml(image.source_url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    return text;
  }
  return image.caption ? escapeHtml(image.caption) : '';
}

// ============================================================
// Source links (Learn more)
// ============================================================

function sourceLinksHtml(person) {
  const links = [];
  if (person.wikipedia_url) {
    links.push(`<a href="${escapeHtml(person.wikipedia_url)}" target="_blank" rel="noopener noreferrer">Wikipedia</a>`);
  }
  if (person.hymnary_url) {
    links.push(`<a href="${escapeHtml(person.hymnary_url)}" target="_blank" rel="noopener noreferrer">Hymnary.org</a>`);
  }
  if (!links.length) return '';
  return `<div class="story-sources">Read more: ${links.join(' &middot; ')}</div>`;
}

// ============================================================
// Memorials
// ============================================================

const MEMORIAL_TYPE_LABELS = {
  gravestone: 'Gravestone',
  statue: 'Statue',
  plaque: 'Plaque',
  monument: 'Monument',
  window: 'Memorial Window',
  church: 'Church',
  museum: 'Museum',
  other: 'Memorial',
};

function memorialTypeLabel(type) {
  return MEMORIAL_TYPE_LABELS[type] || 'Memorial';
}

function directionsUrl(memorial) {
  if (typeof memorial.lat === 'number' && typeof memorial.lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${memorial.lat},${memorial.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(memorial.address)}`;
}

function relatedPeopleSectionHtml(person) {
  const ids = person.related_people || [];
  if (!ids.length) return '';

  const people = ids
    .map(id => allPeople.find(p => p.id === id))
    .filter(Boolean);
  if (!people.length) return '';

  const items = people.map(p => {
    const years = formatYears(p);
    const portrait = p.image
      ? `<img class="related-portrait" src="images/portraits/${escapeHtml(p.image.file)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;related-portrait-placeholder&quot;>${escapeHtml(getInitials(p.name))}</div>'">`
      : `<div class="related-portrait-placeholder">${escapeHtml(getInitials(p.name))}</div>`;
    return `
      <li>
        <a class="related-person-card" href="person.html?id=${escapeHtml(p.id)}">
          ${portrait}
          <span class="related-person-name">${escapeHtml(p.name)}</span>
          <span class="related-person-dates">${escapeHtml(years)}</span>
        </a>
      </li>`;
  }).join('');

  return `
    <div class="person-related">
      <h2 class="person-related-title">&#128279; Related People</h2>
      <ul class="related-list">${items}</ul>
    </div>
  `;
}

function memorialsSectionHtml(person) {
  const memorials = person.memorials || [];
  if (!memorials.length) return '';

  const items = memorials.map(m => `
    <li class="memorial-item">
      <span class="memorial-item-type">${escapeHtml(memorialTypeLabel(m.type))}</span>
      <span class="memorial-item-name">${escapeHtml(m.name)}</span>
      <span class="memorial-item-address">${escapeHtml(m.address)}</span>
      <a class="memorial-item-link" href="${directionsUrl(m)}" target="_blank" rel="noopener noreferrer">Get directions &#8594;</a>
    </li>
  `).join('');

  return `
    <div class="person-memorials">
      <h2 class="person-memorials-title">&#128205; Physical Memorials</h2>
      <ul class="memorial-list">${items}</ul>
      <a class="memorial-map-link" href="map.html?person=${escapeHtml(person.id)}">View on the memorial map &#8594;</a>
    </div>
  `;
}

// ============================================================
// Data loading
// ============================================================

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function applySortOrder(people) {
  const { sort } = filterState;
  if (sort === 'random') {
    const idxMap = new Map(randomOrder.map((p, i) => [p.id, i]));
    return people.slice().sort((a, b) => (idxMap.get(a.id) ?? 9999) - (idxMap.get(b.id) ?? 9999));
  }
  if (sort === 'name-az') return people.slice().sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'name-za') return people.slice().sort((a, b) => b.name.localeCompare(a.name));
  if (sort === 'born-asc') return people.slice().sort((a, b) => (a.born || 0) - (b.born || 0));
  if (sort === 'born-desc') return people.slice().sort((a, b) => (b.born || 0) - (a.born || 0));
  return people;
}

async function loadPeople() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPeople = await res.json();
    randomOrder = shuffleArray(allPeople);
  } catch (err) {
    console.error('Failed to load people.json:', err);
    allPeople = [];
    const grid = document.getElementById('person-grid');
    const content = document.getElementById('person-content');
    if (grid) {
      grid.innerHTML = '<div class="error-message">Unable to load content. Please try again.</div>';
    }
    if (content) {
      content.innerHTML = '<div class="error-message">Unable to load content. Please try again.</div>';
    }
  }
}

// ============================================================
// Index page — card portrait helper
// ============================================================

function cardPortraitHtml(person) {
  if (!person.image) {
    const initials = escapeHtml(getInitials(person.name));
    return `<div class="portrait-placeholder">${initials}</div>`;
  }
  const src = `images/portraits/${escapeHtml(person.image.file)}`;
  const initials = escapeHtml(getInitials(person.name));
  const alt = `Portrait of ${escapeHtml(person.name)}`;
  return `<img
    src="${src}"
    alt="${alt}"
    loading="lazy"
    onerror="this.parentElement.innerHTML='<div class=&quot;portrait-placeholder&quot;>${initials}</div>'"
  >`;
}

// ============================================================
// Index page — card rendering & filtering
// ============================================================

function renderCards(people) {
  const grid = document.getElementById('person-grid');
  if (!grid) return;

  try {
    sessionStorage.setItem('lof-nav-order', JSON.stringify(people.map(p => p.id)));
  } catch (e) { /* quota or private-mode — navigation falls back to alpha */ }

  if (people.length === 0) {
    grid.innerHTML = '<div class="no-results">No people match your current filters.</div>';
    updateResultsCount(0);
    return;
  }

  grid.innerHTML = people.map(person => createCardHtml(person)).join('');
  updateResultsCount(people.length);
}

function createCardHtml(person) {
  const years = escapeHtml(formatYears(person));
  const badge = reviewBadgeHtml(person);
  const tags = person.topics
    .map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`)
    .join('');
  const memorialCount = (person.memorials || []).length;
  const memorialHtml = memorialCount
    ? `<span class="card-memorial-count" title="${memorialCount} ${memorialCount === 1 ? 'memorial' : 'memorials'} recorded">&#128205; ${memorialCount} ${memorialCount === 1 ? 'memorial' : 'memorials'}</span>`
    : '';

  return `
    <article class="person-card" role="listitem" onclick="window.location='person.html?id=${escapeHtml(person.id)}'">
      <div class="card-image">
        ${cardPortraitHtml(person)}
      </div>
      <div class="card-body">
        <h2 class="card-name">
          <a href="person.html?id=${escapeHtml(person.id)}" onclick="event.stopPropagation()">
            ${escapeHtml(person.name)}
          </a>
        </h2>
        <p class="card-dates">${years}</p>
        <p class="card-meta">${escapeHtml(person.nationality)} &middot; ${escapeHtml(person.tradition)}</p>
        <p class="card-meta">${escapeHtml(person.region)} &middot; ${escapeHtml(person.era)}</p>
        <div class="card-topics">${tags}</div>
        <div class="card-badge">${badge}${memorialHtml}</div>
      </div>
    </article>
  `;
}

function updateResultsCount(count) {
  const el = document.getElementById('results-count');
  if (!el) return;
  const total = allPeople.length;
  if (count === total) {
    el.textContent = `Showing all ${total} ${total === 1 ? 'person' : 'people'}`;
  } else {
    el.textContent = `Showing ${count} of ${total} ${total === 1 ? 'person' : 'people'}`;
  }
}

function applyFilters() {
  const { search, topic, hymn, region, era, reviewed } = filterState;

  const filtered = allPeople.filter(person => {
    if (search) {
      const q = search.toLowerCase();
      if (!person.name.toLowerCase().includes(q)) return false;
    }
    if (topic) {
      if (!person.topics.includes(topic)) return false;
    }
    if (hymn) {
      const q = hymn.toLowerCase();
      const match = person.hymns.some(h => h.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (region) {
      if (person.region !== region) return false;
    }
    if (era) {
      if (person.era !== era) return false;
    }
    if (reviewed === 'reviewed') {
      if (!person.review.human_reviewed) return false;
    } else if (reviewed === 'unreviewed') {
      if (person.review.human_reviewed) return false;
    }
    return true;
  });

  renderCards(applySortOrder(filtered));
}

function initIndexPage() {
  injectIndexSeo(allPeople);

  const searchInput  = document.getElementById('search-input');
  const regionSel    = document.getElementById('filter-region');
  const eraSel       = document.getElementById('filter-era');
  const topicSel     = document.getElementById('filter-topic');
  const hymnInput    = document.getElementById('filter-hymn');
  const reviewedSel  = document.getElementById('filter-reviewed');
  const sortSel      = document.getElementById('sort-order');
  const clearBtn     = document.getElementById('clear-filters');

  // Pre-populate filters from URL params (enables SearchAction schema and shareable filter URLs)
  const urlParams = new URLSearchParams(window.location.search);
  const paramQ = urlParams.get('q') || urlParams.get('search') || '';
  if (paramQ && searchInput) { filterState.search = paramQ; searchInput.value = paramQ; }
  const paramRegion = urlParams.get('region') || '';
  if (paramRegion && regionSel) { filterState.region = paramRegion; regionSel.value = paramRegion; }
  const paramEra = urlParams.get('era') || '';
  if (paramEra && eraSel) { filterState.era = paramEra; eraSel.value = paramEra; }
  const paramTopic = urlParams.get('topic') || '';
  if (paramTopic && topicSel) { filterState.topic = paramTopic; topicSel.value = paramTopic; }
  const paramHymn = urlParams.get('hymn') || '';
  if (paramHymn && hymnInput) { filterState.hymn = paramHymn; hymnInput.value = paramHymn; }

  applyFilters();

  let searchTimer;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filterState.search = searchInput.value.trim();
        applyFilters();
      }, 200);
    });
  }

  if (hymnInput) {
    hymnInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filterState.hymn = hymnInput.value.trim();
        applyFilters();
      }, 200);
    });
  }

  if (regionSel) {
    regionSel.addEventListener('change', () => {
      filterState.region = regionSel.value;
      applyFilters();
    });
  }

  if (eraSel) {
    eraSel.addEventListener('change', () => {
      filterState.era = eraSel.value;
      applyFilters();
    });
  }

  if (topicSel) {
    topicSel.addEventListener('change', () => {
      filterState.topic = topicSel.value;
      applyFilters();
    });
  }

  if (reviewedSel) {
    reviewedSel.addEventListener('change', () => {
      filterState.reviewed = reviewedSel.value;
      applyFilters();
    });
  }

  if (sortSel) {
    sortSel.addEventListener('change', () => {
      filterState.sort = sortSel.value;
      applyFilters();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      filterState.search = '';
      filterState.topic = '';
      filterState.hymn = '';
      filterState.region = '';
      filterState.era = '';
      filterState.reviewed = '';
      filterState.sort = 'random';
      if (searchInput)  searchInput.value  = '';
      if (hymnInput)    hymnInput.value    = '';
      if (regionSel)    regionSel.value    = '';
      if (eraSel)       eraSel.value       = '';
      if (topicSel)     topicSel.value     = '';
      if (reviewedSel)  reviewedSel.value  = '';
      if (sortSel)      sortSel.value      = 'random';
      applyFilters();
    });
  }
}

// ============================================================
// Person page — Prev / Next navigation
// ============================================================

function getPersonNav(currentId) {
  let orderedIds = null;
  try {
    const stored = sessionStorage.getItem('lof-nav-order');
    if (stored) orderedIds = JSON.parse(stored);
  } catch (e) { /* ignore */ }

  if (!orderedIds || orderedIds.length === 0) {
    orderedIds = allPeople.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => p.id);
  }

  const idx = orderedIds.indexOf(currentId);
  if (idx === -1) return { prev: null, next: null, total: orderedIds.length, position: null };

  const prevId = idx > 0 ? orderedIds[idx - 1] : null;
  const nextId = idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null;

  return {
    prev: prevId ? allPeople.find(p => p.id === prevId) || null : null,
    next: nextId ? allPeople.find(p => p.id === nextId) || null : null,
    total: orderedIds.length,
    position: idx + 1,
  };
}

function renderPersonNav(person) {
  const navEls = document.querySelectorAll('.person-nav');
  if (!navEls.length) return;

  const { prev, next } = getPersonNav(person.id);

  navEls.forEach(nav => {
    if (!prev && !next) { nav.hidden = true; return; }

    const prevHtml = prev
      ? `<a class="person-nav__link person-nav__prev" href="person.html?id=${escapeHtml(prev.id)}" aria-label="Previous: ${escapeHtml(prev.name)}">&#8592; ${escapeHtml(prev.name)}</a>`
      : `<span class="person-nav__spacer"></span>`;

    const nextHtml = next
      ? `<a class="person-nav__link person-nav__next" href="person.html?id=${escapeHtml(next.id)}" aria-label="Next: ${escapeHtml(next.name)}">${escapeHtml(next.name)} &#8594;</a>`
      : `<span class="person-nav__spacer"></span>`;

    nav.innerHTML = prevHtml + nextHtml;
  });
}

// ============================================================
// SEO helpers for person page
// ============================================================

const SITE_URL = 'https://andyrabel.github.io/livesoffaith';

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) { el.setAttribute(attr, value); return true; }
  return false;
}

function truncateSummary(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  const cut = text.lastIndexOf(' ', maxLen);
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, maxLen)) + '…';
}

function injectPersonSeo(person) {
  const pageUrl = `${SITE_URL}/person.html?id=${encodeURIComponent(person.id)}`;
  const born = person.born_approximate ? `c. ${person.born}` : String(person.born);
  const died = person.died ? String(person.died) : undefined;
  const dates = died ? `${born}–${died}` : `b. ${born}`;

  // Description: use source_summary snippet if available, else generic fallback
  const summarySnippet = person.source_summary
    ? truncateSummary(person.source_summary, 150)
    : `${person.nationality} ${person.tradition}.`;
  const description = `${person.name} (${dates}) — ${summarySnippet} Lives of Faith.`;

  // Title includes dates for richer search snippets
  const fullTitle = `${person.name} (${dates}) — Lives of Faith`;

  // Keywords: name + topics + hymns + nationality + era
  const keywordParts = [
    person.name,
    ...(person.topics || []),
    ...(person.hymns || []),
    person.nationality,
    person.era,
    person.tradition,
    'Christian biography',
    'Lives of Faith',
  ].filter(Boolean);
  const keywords = [...new Set(keywordParts)].join(', ');

  // Basic meta
  document.title = fullTitle;
  setMeta('meta[name="description"]', 'content', description);
  const kwEl = document.getElementById('meta-keywords');
  if (kwEl) kwEl.setAttribute('content', keywords);

  // Canonical
  const canonical = document.getElementById('canonical-link');
  if (canonical) canonical.setAttribute('href', pageUrl);

  // Open Graph
  const ogUrl = document.getElementById('og-url');
  if (ogUrl) ogUrl.setAttribute('content', pageUrl);
  const ogTitle = document.getElementById('og-title');
  if (ogTitle) ogTitle.setAttribute('content', fullTitle);
  const ogDesc = document.getElementById('og-description');
  if (ogDesc) ogDesc.setAttribute('content', description);
  const sectionEl = document.getElementById('article-section');
  if (sectionEl) sectionEl.setAttribute('content', person.era || '');
  if (person.image) {
    const imgUrl = `${SITE_URL}/images/portraits/${encodeURIComponent(person.image.file)}`;
    const imgAlt = `Portrait of ${person.name}, ${person.nationality} ${person.tradition}`;
    const ogImg = document.getElementById('og-image');
    if (ogImg) ogImg.setAttribute('content', imgUrl);
    const ogImgAlt = document.getElementById('og-image-alt');
    if (ogImgAlt) ogImgAlt.setAttribute('content', imgAlt);
    const twImg = document.getElementById('twitter-image');
    if (twImg) twImg.setAttribute('content', imgUrl);
    const twImgAlt = document.getElementById('twitter-image-alt');
    if (twImgAlt) twImgAlt.setAttribute('content', imgAlt);
  }

  // Twitter Card
  const twTitle = document.getElementById('twitter-title');
  if (twTitle) twTitle.setAttribute('content', fullTitle);
  const twDesc = document.getElementById('twitter-description');
  if (twDesc) twDesc.setAttribute('content', description);

  // JSON-LD: Person + BreadcrumbList
  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': person.name,
    'url': pageUrl,
    'description': description,
    'nationality': person.nationality,
    'affiliation': person.tradition,
  };
  if (person.born) personLd['birthDate'] = String(person.born);
  if (person.died) personLd['deathDate'] = String(person.died);
  if (person.wikipedia_url) personLd['sameAs'] = person.wikipedia_url;
  if (person.image) {
    personLd['image'] = `${SITE_URL}/images/portraits/${encodeURIComponent(person.image.file)}`;
  }
  if (person.topics && person.topics.length) {
    personLd['knowsAbout'] = person.topics;
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Lives of Faith', 'item': `${SITE_URL}/` },
      { '@type': 'ListItem', 'position': 2, 'name': person.name, 'item': pageUrl },
    ],
  };

  [personLd, breadcrumbLd].forEach(ld => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  });
}

function injectIndexSeo(people) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Notable Christians Throughout History',
    'description': 'Christ-centred biographies of Christians from every era and region — for worship, teaching, and family devotion.',
    'url': `${SITE_URL}/`,
    'numberOfItems': people.length,
    'itemListElement': people.map((p, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'url': `${SITE_URL}/person.html?id=${encodeURIComponent(p.id)}`,
      'name': p.name,
    })),
  };

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Lives of Faith',
    'url': `${SITE_URL}/`,
    'description': 'Christ-centred biographies of Christians throughout history — for worship leaders, Bible teachers, and families.',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${SITE_URL}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  [itemList, websiteLd].forEach(ld => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  });
}

// ============================================================
// Person page
// ============================================================

function initPersonPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('person-content');
  if (!content) return;

  const person = allPeople.find(p => p.id === id);

  if (!person) {
    content.innerHTML = `
      <div class="error-message">
        <p>Person not found. <a href="index.html">Return to all people</a>.</p>
      </div>
    `;
    return;
  }

  injectPersonSeo(person);

  const years = escapeHtml(formatYears(person));
  const badge = reviewBadgeHtml(person);

  const topics = person.topics
    .map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`)
    .join('');

  const hymnsHtml = person.hymns.length
    ? `<p class="person-hymns">Hymns: ${person.hymns.map(h => escapeHtml(h)).join(', ')}</p>`
    : '';

  const flaggedHtml = person.flagged && person.footnote
    ? `<div class="flagged-notice">
        <div class="flagged-notice__label">&#9888; Note</div>
        <div>${escapeHtml(person.footnote)}</div>
       </div>`
    : '';

  // Portrait
  let portraitHtml;
  if (person.image) {
    const imgSrc = `images/portraits/${escapeHtml(person.image.file)}`;
    const initials = escapeHtml(getInitials(person.name));
    const attribution = buildAttributionHtml(person.image);
    portraitHtml = `
      <div class="person-portrait-wrap">
        <div class="portrait-image-frame">
          <img
            class="person-portrait"
            src="${imgSrc}"
            alt="Portrait of ${escapeHtml(person.name)}"
            onerror="this.parentElement.outerHTML='<div class=&quot;person-portrait-placeholder&quot;>${initials}</div>'"
          >
        </div>
      </div>`;
  } else {
    const initials = escapeHtml(getInitials(person.name));
    portraitHtml = `<div class="person-portrait-wrap"><div class="person-portrait-placeholder">${initials}</div></div>`;
  }

  const copyImageBtnHtml = person.image
    ? `<button class="btn btn-copy" id="copy-image-btn">Copy Image</button>`
    : '';

  const version = getStoryVersion();
  const sourcesHtml = sourceLinksHtml(person);
  const memorialsHtml = memorialsSectionHtml(person);
  const relatedHtml = relatedPeopleSectionHtml(person);

  content.innerHTML = `
    <div class="person-header">
      ${portraitHtml}
      <div class="person-info">
        <h1 class="person-name">${escapeHtml(person.name)}</h1>
        <p class="person-dates">${years}</p>
        <div class="person-meta-grid">
          <span class="person-meta-label">Nationality</span>
          <span class="person-meta-value">${escapeHtml(person.nationality)}</span>
          <span class="person-meta-label">Tradition</span>
          <span class="person-meta-value">${escapeHtml(person.tradition)}</span>
          <span class="person-meta-label">Region</span>
          <span class="person-meta-value">${escapeHtml(person.region)}</span>
          <span class="person-meta-label">Era</span>
          <span class="person-meta-value">${escapeHtml(person.era)}</span>
        </div>
        ${hymnsHtml}
        <div class="person-topics">${topics}</div>
      </div>
    </div>

    ${flaggedHtml}

    <div class="story-tabs-wrapper">
      <div class="story-tabs-nav" role="tablist" aria-label="Story version">
        <button class="story-tab${version === 'adult' ? ' active' : ''}"
                role="tab" aria-selected="${version === 'adult'}"
                aria-controls="panel-adult" id="tab-adult" data-version="adult">
          For Worship &amp; Teaching
        </button>
        <button class="story-tab${version === 'family' ? ' active' : ''}"
                role="tab" aria-selected="${version === 'family'}"
                aria-controls="panel-family" id="tab-family" data-version="family">
          Family Version
        </button>
      </div>

      <div class="story-panel${version === 'adult' ? '' : ' hidden'}"
           role="tabpanel" aria-labelledby="tab-adult" id="panel-adult">
        <div class="story-text">${storyToHtml(person.adult_story)}</div>
        ${sourcesHtml}
        <div class="story-panel-footer">
          ${badge}
          <button class="btn btn-copy" data-copy-version="adult">Copy</button>
        </div>
      </div>

      <div class="story-panel${version === 'family' ? '' : ' hidden'}"
           role="tabpanel" aria-labelledby="tab-family" id="panel-family">
        <div class="story-text">${storyToHtml(person.family_story)}</div>
        ${sourcesHtml}
        <div class="story-panel-footer">
          ${badge}
          <button class="btn btn-copy" data-copy-version="family">Copy</button>
        </div>
      </div>
    </div>

    ${memorialsHtml}
    ${relatedHtml}
  `;

  // Tab switching
  content.querySelectorAll('.story-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.version;
      setStoryVersion(v);
      content.querySelectorAll('.story-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.version === v);
        b.setAttribute('aria-selected', String(b.dataset.version === v));
      });
      content.querySelectorAll('.story-panel').forEach(p => {
        p.classList.toggle('hidden', p.id !== `panel-${v}`);
      });
    });
  });

  // Copy story buttons
  content.querySelectorAll('[data-copy-version]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.copyVersion;
      const story = v === 'adult' ? person.adult_story : person.family_story;
      const text = `${person.name} (${formatYears(person)})\n\n${stripLinks(story)}`;
      copyText(text, btn, 'Copied!');
    });
  });

  renderPersonNav(person);
}

// ============================================================
// Clipboard
// ============================================================

async function copyText(text, button, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    flashButton(button, successMsg || 'Copied!');
  } catch (err) {
    flashButton(button, 'Copy failed — please copy manually', true);
    console.error('Clipboard write failed:', err);
  }
}

async function copyImage(src, button) {
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Image not available');
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Not an image');
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    flashButton(button, 'Image copied!');
  } catch (err) {
    flashButton(button, 'Right-click image to copy', true);
    console.error('Image copy failed:', err);
  }
}

function flashButton(button, msg, isError) {
  const original = button.textContent;
  button.textContent = msg;
  button.classList.add('copied');
  if (isError) button.style.background = '#fde8e8';
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
    button.style.background = '';
  }, 2400);
}

// ============================================================
// Map page
// ============================================================

const mapState = {
  search: '',
  region: '',
  type: '',
};

let leafletMap = null;
let markerClusterGroup = null;
const markersByKey = new Map();

function memorialKey(person, memorial, idx) {
  return `${person.id}__${idx}`;
}

function getAllMemorialEntries() {
  const entries = [];
  allPeople.forEach(person => {
    (person.memorials || []).forEach((memorial, idx) => {
      entries.push({ person, memorial, key: memorialKey(person, memorial, idx) });
    });
  });
  return entries;
}

function filterMemorialEntries(entries) {
  const { search, region, type } = mapState;
  return entries.filter(({ person, memorial }) => {
    if (search && !person.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (region && person.region !== region) return false;
    if (type && memorial.type !== type) return false;
    return true;
  });
}

function mapPopupHtml(person, memorial) {
  const imgSrc = person.image ? `images/portraits/${escapeHtml(person.image.file)}` : '';
  const initials = escapeHtml(getInitials(person.name));
  const portrait = person.image
    ? `<img class="map-popup-portrait" src="${imgSrc}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;map-list-portrait-placeholder&quot;>${initials}</div>'">`
    : `<div class="map-list-portrait-placeholder">${initials}</div>`;

  return `
    <div class="map-popup">
      ${portrait}
      <div class="map-popup-body">
        <div class="map-popup-type">${escapeHtml(memorialTypeLabel(memorial.type))}</div>
        <h3 class="map-popup-name"><a href="person.html?id=${escapeHtml(person.id)}">${escapeHtml(person.name)}</a></h3>
        <div class="map-popup-memorial-name">${escapeHtml(memorial.name)}</div>
        <div class="map-popup-address">${escapeHtml(memorial.address)}</div>
        <div class="map-popup-links">
          <a href="${directionsUrl(memorial)}" target="_blank" rel="noopener noreferrer">Directions</a>
          <a href="person.html?id=${escapeHtml(person.id)}">Profile</a>
        </div>
      </div>
    </div>
  `;
}

function renderMapMarkers(entries) {
  markerClusterGroup.clearLayers();
  markersByKey.clear();

  entries.forEach(({ person, memorial, key }) => {
    const marker = L.marker([memorial.lat, memorial.lng]);
    marker.bindPopup(mapPopupHtml(person, memorial));
    markerClusterGroup.addLayer(marker);
    markersByKey.set(key, marker);
  });
}

function renderMemorialListPage(entries) {
  const container = document.getElementById('memorial-list-page');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="no-results">No memorials match your current filters.</div>';
    return;
  }

  const byRegion = new Map();
  entries
    .slice()
    .sort((a, b) => a.person.name.localeCompare(b.person.name))
    .forEach(entry => {
      const region = entry.person.region;
      if (!byRegion.has(region)) byRegion.set(region, []);
      byRegion.get(region).push(entry);
    });

  const regions = Array.from(byRegion.keys()).sort();

  container.innerHTML = regions.map(region => {
    const items = byRegion.get(region).map(({ person, memorial, key }) => {
      const imgSrc = person.image ? `images/portraits/${escapeHtml(person.image.file)}` : '';
      const initials = escapeHtml(getInitials(person.name));
      const portrait = person.image
        ? `<img class="map-list-portrait" src="${imgSrc}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;map-list-portrait-placeholder&quot;>${initials}</div>'">`
        : `<div class="map-list-portrait-placeholder">${initials}</div>`;

      return `
        <li class="map-list-item">
          ${portrait}
          <div>
            <div class="map-list-name"><a href="person.html?id=${escapeHtml(person.id)}">${escapeHtml(person.name)}</a></div>
            <div class="map-list-meta">${escapeHtml(memorialTypeLabel(memorial.type))} &middot; ${escapeHtml(memorial.name)}</div>
            <div class="map-list-meta">${escapeHtml(memorial.address)}</div>
          </div>
          <div class="map-list-actions">
            <button type="button" data-locate-key="${escapeHtml(key)}">View on map &#8593;</button>
            <a href="${directionsUrl(memorial)}" target="_blank" rel="noopener noreferrer">Directions</a>
          </div>
        </li>
      `;
    }).join('');

    return `
      <div class="memorial-region-group">
        <h2>${escapeHtml(region)}</h2>
        <ul class="memorial-list">${items}</ul>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-locate-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const marker = markersByKey.get(btn.dataset.locateKey);
      if (!marker) return;
      document.getElementById('memorial-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      leafletMap.setView(marker.getLatLng(), 12);
      markerClusterGroup.zoomToShowLayer(marker, () => marker.openPopup());
    });
  });
}

function updateMapResultsCount(count, total) {
  const el = document.getElementById('map-results-count');
  if (!el) return;
  el.textContent = count === total
    ? `Showing all ${total} ${total === 1 ? 'memorial' : 'memorials'}`
    : `Showing ${count} of ${total} ${total === 1 ? 'memorial' : 'memorials'}`;
}

function applyMapFilters() {
  const all = getAllMemorialEntries();
  const filtered = filterMemorialEntries(all);
  renderMapMarkers(filtered);
  renderMemorialListPage(filtered);
  updateMapResultsCount(filtered.length, all.length);
}

function initMapPage() {
  const mapEl = document.getElementById('memorial-map');
  if (!mapEl || typeof L === 'undefined') return;

  leafletMap = L.map(mapEl).setView([25, 10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(leafletMap);

  markerClusterGroup = L.markerClusterGroup();
  leafletMap.addLayer(markerClusterGroup);

  const params = new URLSearchParams(window.location.search);
  const personId = params.get('person');
  if (personId) {
    const person = allPeople.find(p => p.id === personId);
    if (person) mapState.search = person.name;
  }

  const searchInput = document.getElementById('map-search-input');
  const regionSelect = document.getElementById('map-filter-region');
  const typeSelect = document.getElementById('map-filter-type');
  const clearBtn = document.getElementById('map-clear-filters');

  if (searchInput) {
    searchInput.value = mapState.search;
    searchInput.addEventListener('input', () => {
      mapState.search = searchInput.value;
      applyMapFilters();
    });
  }
  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      mapState.region = regionSelect.value;
      applyMapFilters();
    });
  }
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      mapState.type = typeSelect.value;
      applyMapFilters();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      mapState.search = '';
      mapState.region = '';
      mapState.type = '';
      if (searchInput) searchInput.value = '';
      if (regionSelect) regionSelect.value = '';
      if (typeSelect) typeSelect.value = '';
      applyMapFilters();
      leafletMap.setView([25, 10], 2);
    });
  }

  applyMapFilters();

  if (personId && markerClusterGroup.getLayers().length) {
    const layers = markerClusterGroup.getLayers();
    if (layers.length === 1) {
      leafletMap.setView(layers[0].getLatLng(), 10);
      markerClusterGroup.zoomToShowLayer(layers[0], () => layers[0].openPopup());
    } else if (layers.length > 1) {
      const group = L.featureGroup(layers);
      leafletMap.fitBounds(group.getBounds().pad(0.3));
    }
  }
}

// ============================================================
// Boot
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadPeople();

  if (document.getElementById('person-grid')) {
    initIndexPage();
  } else if (document.getElementById('person-content')) {
    initPersonPage();
  } else if (document.getElementById('memorial-map')) {
    initMapPage();
  }
});
