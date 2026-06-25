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
    .map(para => `<p>${escapeHtml(para.trim())}</p>`)
    .join('\n');
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
  if (!text) return '';
  if (image.source_url) {
    return `<a href="${escapeHtml(image.source_url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  return text;
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
        <div class="card-badge">${badge}</div>
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
  renderCards(applySortOrder(allPeople));

  const searchInput  = document.getElementById('search-input');
  const regionSel    = document.getElementById('filter-region');
  const eraSel       = document.getElementById('filter-era');
  const topicSel     = document.getElementById('filter-topic');
  const hymnInput    = document.getElementById('filter-hymn');
  const reviewedSel  = document.getElementById('filter-reviewed');
  const sortSel      = document.getElementById('sort-order');
  const clearBtn     = document.getElementById('clear-filters');

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

  document.title = `${person.name} — Lives of Faith`;

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
        <img
          class="person-portrait"
          src="${imgSrc}"
          alt="Portrait of ${escapeHtml(person.name)}"
          onerror="this.outerHTML='<div class=&quot;person-portrait-placeholder&quot;>${initials}</div>'"
        >
        ${attribution ? `<p class="person-portrait-caption">${attribution}</p>` : ''}
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
      const text = `${person.name} (${formatYears(person)})\n\n${story}`;
      copyText(text, btn, 'Copied!');
    });
  });

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
// Boot
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadPeople();

  if (document.getElementById('person-grid')) {
    initIndexPage();
  } else if (document.getElementById('person-content')) {
    initPersonPage();
  }
});
