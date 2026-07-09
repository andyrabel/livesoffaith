/* ============================================================
   Lives of Faith — app.js
   Handles: data loading, card rendering, search/filter,
            person page rendering, clipboard copy.
   ============================================================ */

const DATA_URL = 'data/people.json';
const PLACES_URL = 'data/places.json';
const PAGEVIEWS_URL = 'data/pageviews.json';
const QUIZ_URL = 'data/quiz.json';
const VERSES_URL = 'data/verses.json';
const HYMNS_URL = 'data/hymns.json';
const STORY_PREF_KEY = 'preferred-story-version';
const QUIZ_DIFFICULTY_KEY = 'preferred-quiz-difficulty';

let allPeople = [];
let allPlaces = [];
let randomOrder = [];
let pageviews = {};
let allQuiz = [];
let allVerses = {};
let allHymns = [];

const filterState = {
  search: '',
  topic: '',
  hymn: '',
  region: '',
  era: '',
  reviewed: '',
  sort: 'popularity',
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
// Quiz print difficulty preference (localStorage)
// ============================================================

function getQuizPrintDifficulty() {
  return localStorage.getItem(QUIZ_DIFFICULTY_KEY) || '3';
}

function setQuizPrintDifficulty(v) {
  localStorage.setItem(QUIZ_DIFFICULTY_KEY, v);
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
  library: 'Library',
  archive: 'Archive',
  other: 'Memorial',
  custom: 'Custom Stop',
};

function memorialTypeLabel(type) {
  return MEMORIAL_TYPE_LABELS[type] || 'Memorial';
}

// Marker styling per memorial/place type — a distinct colour plus a
// Lucide (lucide.dev, ISC-licensed) icon so pins are visually
// distinguishable at a glance and in the legend, independent of any
// text label (which may be truncated in small UI elements).
const MEMORIAL_TYPE_STYLES = {
  gravestone: { color: '#5b6470' },
  statue:     { color: '#8a7b6c' },
  plaque:     { color: '#1c3d5a' },
  monument:   { color: '#7c4012' },
  window:     { color: '#2b7a8b' },
  church:     { color: '#5b3a8c' },
  museum:     { color: '#a8832a' },
  library:    { color: '#1f5c3a' },
  archive:    { color: '#9c2b2b' },
  other:      { color: '#6b6360' },
  custom:     { color: '#b5384a' },
};

// Inner markup (no outer <svg>) of Lucide icons, one per memorial/place
// type — cross for a grave marker, a standing figure for a statue, an
// inscribed scroll for a plaque, an obelisk for a monument, and so on.
const MEMORIAL_TYPE_ICON_PATHS = {
  gravestone: '<path d="M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z"/>',
  statue: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  plaque: '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  monument: '<path d="M2.5 16.88a1 1 0 0 1-.32-1.43l9-13.02a1 1 0 0 1 1.64 0l9 13.01a1 1 0 0 1-.32 1.44l-8.51 4.86a2 2 0 0 1-1.98 0Z"/><path d="M12 2v20"/>',
  window: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/>',
  church: '<path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="m18 9 3.52 2.147a1 1 0 0 1 .48.854V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.999a1 1 0 0 1 .48-.854L6 9"/><path d="M6 21V7a1 1 0 0 1 .376-.782l5-3.999a1 1 0 0 1 1.249.001l5 4A1 1 0 0 1 18 7v14"/>',
  museum: '<path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  other: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
};

function memorialTypeStyle(type) {
  return MEMORIAL_TYPE_STYLES[type] || MEMORIAL_TYPE_STYLES.other;
}

function memorialTypeIconSvg(type, size) {
  const paths = MEMORIAL_TYPE_ICON_PATHS[type] || MEMORIAL_TYPE_ICON_PATHS.other;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function memorialTypeIcon(type) {
  const style = memorialTypeStyle(type);
  return L.divIcon({
    className: 'memorial-marker-icon',
    html: `<span class="memorial-pin" style="background:${style.color}"><span>${memorialTypeIconSvg(type, 15)}</span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

function accessBadgeHtml(entryLike) {
  if (typeof entryLike.open_to_public !== 'boolean' || entryLike.open_to_public) return '';
  return `<span class="map-popup-access-badge" title="Not open for casual walk-in visits">&#128274; By appointment</span>`;
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

const SIGNIFICANT_DATE_LABELS = {
  birth: 'Born',
  death: 'Died',
  martyred: 'Martyred',
  saved: 'Saved',
  other: ''
};

function significantDatesSectionHtml(person) {
  const dates = person.significant_dates || [];
  if (!dates.length) return '';

  const items = dates.map(d => {
    const label = SIGNIFICANT_DATE_LABELS[d.event] || '';
    const details = d.details ? escapeHtml(d.details) : '';
    return `
      <li class="timeline-item">
        <span class="timeline-date">${escapeHtml(d.date)}</span>
        <span class="timeline-text">${label ? `<strong>${label}.</strong> ` : ''}${details}</span>
      </li>
    `;
  }).join('');

  return `
    <div class="person-timeline">
      <h2 class="person-timeline-title">&#128197; Timeline</h2>
      <ul class="timeline-list">${items}</ul>
    </div>
  `;
}

// ============================================================
// "Verse of the Day" home page banner
// ============================================================

// Same seeded-pick approach as "On this day"/quiz box, with its own seed
// prefix so the three don't land on the same hash slot.
function renderVerseOfDay() {
  const container = document.getElementById('verse-of-day');
  if (!container) return;

  const refs = Object.keys(allVerses);
  if (!refs.length) return;

  const today = new Date();
  const seed = `verse-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const ref = refs[seededIndex(seed, refs.length)];
  const verse = allVerses[ref];

  container.innerHTML = `
    <div class="verse-of-day" role="button" tabindex="0" aria-expanded="false">
      <span class="verse-of-day__label">Verse of the Day</span>
      <span class="verse-of-day__quote" title="${escapeHtml(verse.text)}">&#8220;${escapeHtml(verse.text)}&#8221;</span>
      <span class="verse-of-day__ref">${escapeHtml(ref)}</span>
    </div>
  `;

  const banner = container.querySelector('.verse-of-day');
  const toggle = () => {
    const expanded = banner.classList.toggle('verse-of-day--expanded');
    banner.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };
  banner.addEventListener('click', toggle);
  banner.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
}

// ============================================================
// "On this day" home page banner
// ============================================================

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Only dates with a full "Mon D, YYYY" precision (see Significant Dates
// Schema in CLAUDE.md) carry a day-of-year we can match "on this day"
// against — "Jan 1976" and "1976"/"c. 1725" precision entries are skipped.
function parseFullDate(dateStr) {
  const m = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(dateStr || '');
  if (!m) return null;
  const month = MONTH_ABBR.indexOf(m[1]);
  if (month === -1) return null;
  return { month, day: parseInt(m[2], 10), year: parseInt(m[3], 10) };
}

function getOnThisDayCandidates(people, month, day) {
  const candidates = [];
  people.forEach(person => {
    (person.significant_dates || []).forEach(dateEntry => {
      const parsed = parseFullDate(dateEntry.date);
      if (parsed && parsed.month === month && parsed.day === day) {
        candidates.push({ person, dateEntry });
      }
    });
  });
  return candidates;
}

// Deterministic (not Math.random) so every visitor sees the same pick for
// the day and it doesn't change on refresh.
function seededIndex(seedStr, length) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function withPeriod(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function renderOnThisDay() {
  const introEl = document.querySelector('.intro');
  if (!introEl) return;

  const today = new Date();
  const candidates = getOnThisDayCandidates(allPeople, today.getMonth(), today.getDate());
  if (!candidates.length) return;

  const seed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const { person, dateEntry } = candidates[seededIndex(seed, candidates.length)];

  const initials = escapeHtml(getInitials(person.name));
  const thumbHtml = person.image
    ? `<img class="on-this-day__portrait" src="images/portraits/${escapeHtml(person.image.file)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;on-this-day__portrait on-this-day__portrait--placeholder&quot;>${initials}</div>'">`
    : `<div class="on-this-day__portrait on-this-day__portrait--placeholder">${initials}</div>`;

  introEl.innerHTML = `
    <a class="on-this-day" href="person.html?id=${escapeHtml(person.id)}">
      ${thumbHtml}
      <span class="on-this-day__text">
        <span class="on-this-day__label">On this day, ${escapeHtml(dateEntry.date)}</span>
        <span class="on-this-day__name">${escapeHtml(person.name)}.</span>
        ${escapeHtml(withPeriod(dateEntry.details))}
      </span>
    </a>
  `;
}

// ============================================================
// "Hymn of the Day" home page banner
// ============================================================

// Same seeded-pick approach as "Verse of the Day"/"On this day", with its
// own seed prefix so the boxes don't land on the same hash slot.
function renderHymnOfDay() {
  const container = document.getElementById('hymn-of-day');
  if (!container || !allHymns.length) return;

  const today = new Date();
  const seed = `hymn-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const hymn = allHymns[seededIndex(seed, allHymns.length)];
  const writer = hymnWriter(hymn);

  container.innerHTML = `
    <a class="hymn-of-day" href="hymn.html?id=${escapeHtml(hymn.id)}">
      <span class="hymn-of-day__label">Hymn of the Day</span>
      <span class="hymn-of-day__title">&#8220;${escapeHtml(hymn.title)}&#8221;</span>
      ${writer ? `<span class="hymn-of-day__writer">${escapeHtml(writer.name)}</span>` : ''}
    </a>
  `;
}

// ============================================================
// Quiz question home page box
// ============================================================

// Same seeded pick every visitor gets today, changes at midnight —
// distinct seed prefix from "On this day" so the two don't happen to
// land on the same hash slot.
function renderQuizQuestion() {
  const container = document.getElementById('quiz-question');
  if (!container || !allQuiz.length) return;

  // Defaults to Medium until the visitor picks a difficulty on the print-quiz page.
  const maxDifficulty = parseInt(getQuizPrintDifficulty(), 10);
  const pool = allQuiz.filter(q => q.difficulty <= maxDifficulty);
  if (!pool.length) return;

  const today = new Date();
  const seed = `quiz-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const q = pool[seededIndex(seed, pool.length)];
  const person = allPeople.find(p => p.id === q.person_id);
  const hymn = allHymns.find(h => h.id === q.hymn_id);

  const answerLinkHtml = hymn
    ? `<a class="quiz-box__answer-link" href="hymn.html?id=${escapeHtml(hymn.id)}">The story behind &ldquo;${escapeHtml(hymn.title)}&rdquo; &#8594;</a>`
    : person
    ? `<a class="quiz-box__answer-link" href="person.html?id=${escapeHtml(person.id)}">More about ${escapeHtml(person.name)} &#8594;</a>`
    : '';

  container.innerHTML = `
    <div class="quiz-box">
      <span class="quiz-box__label">Quiz Question:</span>
      <span class="quiz-box__question">${escapeHtml(q.question)}</span>
      <button class="quiz-box__reveal-btn" type="button" aria-expanded="false">Reveal Answer</button>
      <span class="quiz-box__answer" hidden><strong>${escapeHtml(q.answer)}</strong>${answerLinkHtml}</span>
      <a class="quiz-box__print-link" href="quiz-print.html">&#128438; Print a quiz &#8594;</a>
    </div>
  `;

  const btn = container.querySelector('.quiz-box__reveal-btn');
  const answerEl = container.querySelector('.quiz-box__answer');
  btn.addEventListener('click', () => {
    btn.remove();
    answerEl.hidden = false;
    answerEl.setAttribute('tabindex', '-1');
    answerEl.focus();
  });
}

// ============================================================
// Printable quiz page (quiz-print.html)
// ============================================================

const QUIZ_PRINT_COUNT = 10;

function renderPrintQuiz(maxDifficulty) {
  const pool = allQuiz.filter(q => q.difficulty <= maxDifficulty);
  const questions = shuffleArray(pool).slice(0, QUIZ_PRINT_COUNT);

  const questionsList = document.getElementById('quiz-print-questions');
  const answerList = document.getElementById('quiz-print-answer-list');
  const status = document.getElementById('quiz-print-status');
  if (!questionsList || !answerList) return;

  questionsList.innerHTML = questions.map(q => `
    <li class="quiz-print-question">
      <span class="quiz-print-question__text">${escapeHtml(q.question)}</span>
      <span class="quiz-print-question__rule"></span>
    </li>
  `).join('');

  answerList.innerHTML = questions.map(q => {
    const person = allPeople.find(p => p.id === q.person_id);
    const nameSuffix = person && person.name.toLowerCase() !== q.answer.toLowerCase()
      ? ` (${escapeHtml(person.name)})`
      : '';
    return `<li>${escapeHtml(q.answer)}${nameSuffix}</li>`;
  }).join('');

  if (status) {
    status.textContent = questions.length < QUIZ_PRINT_COUNT
      ? `Only ${questions.length} questions available at this difficulty.`
      : '';
  }
}

function initQuizPrintPage() {
  const difficultySel = document.getElementById('quiz-print-difficulty');
  const generateBtn = document.getElementById('quiz-print-generate');
  if (!difficultySel || !generateBtn) return;

  const urlParams = new URLSearchParams(window.location.search);
  const paramMax = urlParams.get('max');
  difficultySel.value = (paramMax && ['1', '3', '5'].includes(paramMax)) ? paramMax : getQuizPrintDifficulty();

  const generate = () => {
    const maxDifficulty = parseInt(difficultySel.value, 10);
    setQuizPrintDifficulty(difficultySel.value);
    const url = new URL(window.location.href);
    url.searchParams.set('max', String(maxDifficulty));
    history.replaceState(null, '', url);
    renderPrintQuiz(maxDifficulty);
  };

  generateBtn.addEventListener('click', generate);
  difficultySel.addEventListener('change', generate);

  generate();
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
  if (sort === 'popularity') return people.slice().sort((a, b) => (pageviews[b.id] || 0) - (pageviews[a.id] || 0));
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

async function loadQuiz() {
  try {
    const res = await fetch(QUIZ_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allQuiz = await res.json();
  } catch (err) {
    console.error('Failed to load quiz.json:', err);
    allQuiz = [];
  }
}

async function loadVerses() {
  try {
    const res = await fetch(VERSES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allVerses = await res.json();
  } catch (err) {
    console.error('Failed to load verses.json:', err);
    allVerses = {};
  }
}

async function loadPlaces() {
  try {
    const res = await fetch(PLACES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPlaces = await res.json();
  } catch (err) {
    console.error('Failed to load places.json:', err);
    allPlaces = [];
  }
}

async function loadHymns() {
  try {
    const res = await fetch(HYMNS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allHymns = await res.json();
  } catch (err) {
    console.error('Failed to load hymns.json:', err);
    allHymns = [];
  }
}

// pageviews.json is regenerated periodically by _build/fetch_pageviews.py
// from GA4 data — absent or stale is a normal, non-error state, not just
// a missing-file fallback, so this stays silent (no console noise) unlike
// loadPeople/loadPlaces above.
async function loadPageviews() {
  try {
    const res = await fetch(PAGEVIEWS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    pageviews = data.views || {};
  } catch (err) {
    pageviews = {};
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
  const viewCount = pageviews[person.id] || 0;
  const viewsHtml = viewCount
    ? `<span class="card-view-count" title="${viewCount.toLocaleString()} page ${viewCount === 1 ? 'view' : 'views'}">&#128065; ${viewCount.toLocaleString()}</span>`
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
        <div class="card-badge">${badge}${memorialHtml}${viewsHtml}</div>
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
  renderOnThisDay();
  renderVerseOfDay();
  renderHymnOfDay();
  renderQuizQuestion();

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

  if (paramQ || paramRegion || paramEra || paramTopic || paramHymn) {
    const detailsEl = document.getElementById('search-filter-details');
    if (detailsEl) detailsEl.open = true;
  }

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
      filterState.sort = 'popularity';
      if (searchInput)  searchInput.value  = '';
      if (hymnInput)    hymnInput.value    = '';
      if (regionSel)    regionSel.value    = '';
      if (eraSel)       eraSel.value       = '';
      if (topicSel)     topicSel.value     = '';
      if (reviewedSel)  reviewedSel.value  = '';
      if (sortSel)      sortSel.value      = 'popularity';
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

const SITE_URL = 'https://livesoffaith.org';

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

  // Fire the pageview manually (auto pageview is disabled in person.html)
  // so it carries person_id, letting fetch_pageviews.py join GA data back
  // to a specific person without parsing the title string.
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title: fullTitle,
      page_location: pageUrl,
      person_id: person.id,
    });
  }

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

  // JSON-LD: Person + BreadcrumbList + Article (full story, for richer extraction)
  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': person.name,
    'url': pageUrl,
    'mainEntityOfPage': pageUrl,
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

  const publisherLd = {
    '@type': 'Organization',
    'name': 'Lives of Faith',
    'url': `${SITE_URL}/`,
  };

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': `${person.name} (${dates})`,
    'description': description,
    'articleBody': stripLinks(person.adult_story || ''),
    'mainEntityOfPage': pageUrl,
    'url': pageUrl,
    'inLanguage': 'en',
    'about': { '@type': 'Person', 'name': person.name, 'sameAs': person.wikipedia_url || undefined },
    'author': publisherLd,
    'publisher': publisherLd,
  };
  if (person.image) {
    articleLd['image'] = `${SITE_URL}/images/portraits/${encodeURIComponent(person.image.file)}`;
  }

  [personLd, breadcrumbLd, articleLd].forEach(ld => {
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

function injectHymnsIndexSeo(hymns) {
  const pageUrl = `${SITE_URL}/hymns.html`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Hymn Stories',
    'description': 'The documented history behind individual hymns — who wrote them, when, and the Scripture that shaped them.',
    'url': pageUrl,
    'numberOfItems': hymns.length,
    'itemListElement': hymns.map((h, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'url': `${SITE_URL}/hymn.html?id=${encodeURIComponent(h.id)}`,
      'name': h.title,
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Lives of Faith', 'item': `${SITE_URL}/` },
      { '@type': 'ListItem', 'position': 2, 'name': 'Hymn Stories', 'item': pageUrl },
    ],
  };

  [itemList, breadcrumbLd].forEach(ld => {
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
    ? `<p class="person-hymns">Hymns: ${person.hymns.map(h => hymnTitleLinkHtml(h, person.id)).join(', ')}</p>`
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
  const timelineHtml = significantDatesSectionHtml(person);
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

    ${timelineHtml}
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
// Hymns — index page, detail page, and person<->hymn linking
// ============================================================

// Looks up a title string from a person's `hymns` array against hymns.json
// (matched on title + person_id, since a title alone isn't unique — e.g.
// "Who Is on the Lord's Side?" is credited to both Havergal and Sankey).
// Falls back to plain text when no hymn-story page exists yet for it.
function findHymnByTitle(title, personId) {
  return allHymns.find(h => h.title === title && h.person_id === personId) || null;
}

function hymnTitleLinkHtml(title, personId) {
  const hymn = findHymnByTitle(title, personId);
  if (!hymn) return escapeHtml(title);
  return `<a href="hymn.html?id=${escapeHtml(hymn.id)}" class="person-link">${escapeHtml(title)}</a>`;
}

const hymnFilterState = {
  search: '',
  topic: '',
  sort: 'title-az',
};

function hymnWriter(hymn) {
  return allPeople.find(p => p.id === hymn.person_id) || null;
}

function hymnCardHtml(hymn) {
  const writer = hymnWriter(hymn);
  const writerName = writer ? writer.name : '';
  const badge = hymn.review.human_reviewed
    ? `<span class="badge badge-reviewed" title="Reviewed">&#10003; Reviewed for accuracy</span>`
    : `<span class="badge badge-unreviewed">&#9888; AI-generated — not yet human reviewed</span>`;
  const tags = (hymn.topics || [])
    .map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`)
    .join('');

  return `
    <article class="person-card hymn-card" role="listitem" onclick="window.location='hymn.html?id=${escapeHtml(hymn.id)}'">
      <div class="card-body">
        <h2 class="card-name">
          <a href="hymn.html?id=${escapeHtml(hymn.id)}" onclick="event.stopPropagation()">
            ${escapeHtml(hymn.title)}
          </a>
        </h2>
        <p class="card-dates">${escapeHtml(hymn.year)}</p>
        ${writerName ? `<p class="card-meta">${escapeHtml(writerName)}</p>` : ''}
        <p class="card-meta">${escapeHtml(hymn.scripture_basis)}</p>
        <div class="card-topics">${tags}</div>
        <div class="card-badge">${badge}</div>
      </div>
    </article>
  `;
}

function updateHymnResultsCount(count) {
  const el = document.getElementById('hymn-results-count');
  if (!el) return;
  const total = allHymns.length;
  el.textContent = count === total
    ? `Showing all ${total} hymn ${total === 1 ? 'story' : 'stories'}`
    : `Showing ${count} of ${total} hymn stories`;
}

function applyHymnSortOrder(hymns) {
  const { sort } = hymnFilterState;
  if (sort === 'title-az') return hymns.slice().sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'title-za') return hymns.slice().sort((a, b) => b.title.localeCompare(a.title));
  if (sort === 'writer-az') {
    return hymns.slice().sort((a, b) => {
      const wa = hymnWriter(a);
      const wb = hymnWriter(b);
      return (wa ? wa.name : '').localeCompare(wb ? wb.name : '');
    });
  }
  return hymns;
}

function renderHymnCards(hymns) {
  const grid = document.getElementById('hymn-grid');
  if (!grid) return;

  try {
    sessionStorage.setItem('lof-hymn-nav-order', JSON.stringify(hymns.map(h => h.id)));
  } catch (e) { /* quota or private-mode — navigation falls back to alpha */ }

  if (hymns.length === 0) {
    grid.innerHTML = '<div class="no-results">No hymns match your current filters.</div>';
    updateHymnResultsCount(0);
    return;
  }

  grid.innerHTML = hymns.map(hymn => hymnCardHtml(hymn)).join('');
  updateHymnResultsCount(hymns.length);
}

function applyHymnFilters() {
  const { search, topic } = hymnFilterState;

  const filtered = allHymns.filter(hymn => {
    if (search) {
      const q = search.toLowerCase();
      const writer = hymnWriter(hymn);
      const writerName = writer ? writer.name.toLowerCase() : '';
      if (!hymn.title.toLowerCase().includes(q) && !writerName.includes(q)) return false;
    }
    if (topic) {
      if (!(hymn.topics || []).includes(topic)) return false;
    }
    return true;
  });

  renderHymnCards(applyHymnSortOrder(filtered));
}

function initHymnsIndexPage() {
  const searchInput = document.getElementById('hymn-search-input');
  const topicSel = document.getElementById('hymn-filter-topic');
  const sortSel = document.getElementById('hymn-sort-order');
  const clearBtn = document.getElementById('hymn-clear-filters');

  injectHymnsIndexSeo(allHymns);
  applyHymnFilters();

  let searchTimer;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        hymnFilterState.search = searchInput.value.trim();
        applyHymnFilters();
      }, 200);
    });
  }

  if (topicSel) {
    topicSel.addEventListener('change', () => {
      hymnFilterState.topic = topicSel.value;
      applyHymnFilters();
    });
  }

  if (sortSel) {
    sortSel.addEventListener('change', () => {
      hymnFilterState.sort = sortSel.value;
      applyHymnFilters();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      hymnFilterState.search = '';
      hymnFilterState.topic = '';
      hymnFilterState.sort = 'title-az';
      if (searchInput) searchInput.value = '';
      if (topicSel) topicSel.value = '';
      if (sortSel) sortSel.value = 'title-az';
      applyHymnFilters();
    });
  }
}

function injectHymnSeo(hymn, writer) {
  const pageUrl = `${SITE_URL}/hymn.html?id=${encodeURIComponent(hymn.id)}`;
  const hymnsUrl = `${SITE_URL}/hymns.html`;
  const writerName = writer ? writer.name : 'an unknown writer';
  const description = `The story behind "${hymn.title}" (${hymn.year}), written by ${writerName} — grounded in ${hymn.scripture_basis}. Lives of Faith.`;
  const fullTitle = `${hymn.title} — The Story Behind the Hymn — Lives of Faith`;

  document.title = fullTitle;
  setMeta('meta[name="description"]', 'content', description);
  const kwEl = document.getElementById('meta-keywords');
  if (kwEl) {
    const keywordParts = [
      hymn.title,
      writerName,
      String(hymn.year),
      hymn.scripture_basis,
      ...(hymn.topics || []),
      'hymn story',
      'hymn history',
      'Lives of Faith',
    ].filter(Boolean);
    kwEl.setAttribute('content', [...new Set(keywordParts)].join(', '));
  }

  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title: fullTitle,
      page_location: pageUrl,
      hymn_id: hymn.id,
    });
  }

  const canonical = document.getElementById('canonical-link');
  if (canonical) canonical.setAttribute('href', pageUrl);
  const ogUrl = document.getElementById('og-url');
  if (ogUrl) ogUrl.setAttribute('content', pageUrl);
  const ogTitle = document.getElementById('og-title');
  if (ogTitle) ogTitle.setAttribute('content', fullTitle);
  const ogDesc = document.getElementById('og-description');
  if (ogDesc) ogDesc.setAttribute('content', description);
  const twTitle = document.getElementById('twitter-title');
  if (twTitle) twTitle.setAttribute('content', fullTitle);
  const twDesc = document.getElementById('twitter-description');
  if (twDesc) twDesc.setAttribute('content', description);

  // Use the writer's portrait for social share cards when one exists,
  // falling back to the default site logo already set in hymn.html.
  if (writer && writer.image) {
    const imgUrl = `${SITE_URL}/images/portraits/${encodeURIComponent(writer.image.file)}`;
    const imgAlt = `Portrait of ${writer.name}`;
    const ogImg = document.getElementById('og-image');
    if (ogImg) ogImg.setAttribute('content', imgUrl);
    const ogImgAlt = document.getElementById('og-image-alt');
    if (ogImgAlt) ogImgAlt.setAttribute('content', imgAlt);
    const twImg = document.getElementById('twitter-image');
    if (twImg) twImg.setAttribute('content', imgUrl);
    const twImgAlt = document.getElementById('twitter-image-alt');
    if (twImgAlt) twImgAlt.setAttribute('content', imgAlt);
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Lives of Faith', 'item': `${SITE_URL}/` },
      { '@type': 'ListItem', 'position': 2, 'name': 'Hymn Stories', 'item': hymnsUrl },
      { '@type': 'ListItem', 'position': 3, 'name': hymn.title, 'item': pageUrl },
    ],
  };

  const publisherLd = { '@type': 'Organization', 'name': 'Lives of Faith', 'url': `${SITE_URL}/` };

  const musicCompositionLd = {
    '@type': 'MusicComposition',
    'name': hymn.title,
  };
  if (hymn.year) musicCompositionLd['dateCreated'] = String(hymn.year);
  if (writer) {
    musicCompositionLd['lyricist'] = {
      '@type': 'Person',
      'name': writer.name,
      'url': `${SITE_URL}/person.html?id=${encodeURIComponent(writer.id)}`,
    };
  }

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': hymn.title,
    'description': description,
    'articleBody': stripLinks(hymn.adult_story || ''),
    'mainEntityOfPage': pageUrl,
    'url': pageUrl,
    'inLanguage': 'en',
    'about': musicCompositionLd,
    'author': publisherLd,
    'publisher': publisherLd,
  };
  if (hymn.wikipedia_url) articleLd['sameAs'] = hymn.wikipedia_url;

  [breadcrumbLd, articleLd].forEach(ld => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  });
}

function getHymnNav(currentId) {
  let orderedIds = null;
  try {
    const stored = sessionStorage.getItem('lof-hymn-nav-order');
    if (stored) orderedIds = JSON.parse(stored);
  } catch (e) { /* ignore */ }

  if (!orderedIds || orderedIds.length === 0) {
    orderedIds = allHymns.slice().sort((a, b) => a.title.localeCompare(b.title)).map(h => h.id);
  }

  const idx = orderedIds.indexOf(currentId);
  if (idx === -1) return { prev: null, next: null, total: orderedIds.length, position: null };

  const prevId = idx > 0 ? orderedIds[idx - 1] : null;
  const nextId = idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null;

  return {
    prev: prevId ? allHymns.find(h => h.id === prevId) || null : null,
    next: nextId ? allHymns.find(h => h.id === nextId) || null : null,
    total: orderedIds.length,
    position: idx + 1,
  };
}

function renderHymnNav(hymn) {
  const navEls = document.querySelectorAll('.hymn-nav');
  if (!navEls.length) return;

  const { prev, next } = getHymnNav(hymn.id);

  navEls.forEach(nav => {
    if (!prev && !next) { nav.hidden = true; return; }

    const prevHtml = prev
      ? `<a class="hymn-nav__link hymn-nav__prev" href="hymn.html?id=${escapeHtml(prev.id)}" aria-label="Previous: ${escapeHtml(prev.title)}">&#8592; ${escapeHtml(prev.title)}</a>`
      : `<span class="hymn-nav__spacer"></span>`;

    const nextHtml = next
      ? `<a class="hymn-nav__link hymn-nav__next" href="hymn.html?id=${escapeHtml(next.id)}" aria-label="Next: ${escapeHtml(next.title)}">${escapeHtml(next.title)} &#8594;</a>`
      : `<span class="hymn-nav__spacer"></span>`;

    nav.innerHTML = prevHtml + nextHtml;
  });
}

function initHymnPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('hymn-content');
  if (!content) return;

  const hymn = allHymns.find(h => h.id === id);

  if (!hymn) {
    content.innerHTML = `
      <div class="error-message">
        <p>Hymn not found. <a href="hymns.html">Return to all hymns</a>.</p>
      </div>
    `;
    return;
  }

  const writer = hymnWriter(hymn);
  injectHymnSeo(hymn, writer);

  const badge = hymn.review.human_reviewed
    ? `<span class="badge badge-reviewed" title="Reviewed${hymn.review.reviewed_by ? ' by ' + escapeHtml(hymn.review.reviewed_by) : ''}">&#10003; Reviewed for accuracy</span>`
    : `<span class="badge badge-unreviewed">&#9888; AI-generated — not yet human reviewed</span>`;

  const writerHtml = writer
    ? `<a href="person.html?id=${escapeHtml(writer.id)}" class="person-link">${escapeHtml(writer.name)}</a>`
    : 'Unknown';

  const topics = (hymn.topics || [])
    .map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`)
    .join('');

  const links = [];
  if (hymn.wikipedia_url) {
    links.push(`<a href="${escapeHtml(hymn.wikipedia_url)}" target="_blank" rel="noopener noreferrer">Wikipedia</a>`);
  }
  const sourcesHtml = links.length ? `<div class="story-sources">Read more: ${links.join(' &middot; ')}</div>` : '';

  const version = getStoryVersion();

  content.innerHTML = `
    <div class="person-header">
      <div class="person-info">
        <h1 class="person-name">${escapeHtml(hymn.title)}</h1>
        <p class="person-dates">${escapeHtml(hymn.year)}</p>
        <div class="person-meta-grid">
          <span class="person-meta-label">Writer</span>
          <span class="person-meta-value">${writerHtml}</span>
          <span class="person-meta-label">Scripture</span>
          <span class="person-meta-value">${escapeHtml(hymn.scripture_basis)}</span>
        </div>
        <div class="person-topics">${topics}</div>
      </div>
    </div>

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
        <div class="story-text">${storyToHtml(hymn.adult_story)}</div>
        ${sourcesHtml}
        <div class="story-panel-footer">
          ${badge}
          <button class="btn btn-copy" data-copy-version="adult">Copy</button>
        </div>
      </div>

      <div class="story-panel${version === 'family' ? '' : ' hidden'}"
           role="tabpanel" aria-labelledby="tab-family" id="panel-family">
        <div class="story-text">${storyToHtml(hymn.family_story)}</div>
        ${sourcesHtml}
        <div class="story-panel-footer">
          ${badge}
          <button class="btn btn-copy" data-copy-version="family">Copy</button>
        </div>
      </div>
    </div>
  `;

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

  content.querySelectorAll('[data-copy-version]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.copyVersion;
      const story = v === 'adult' ? hymn.adult_story : hymn.family_story;
      const text = `${hymn.title} (${hymn.year})\n\n${stripLinks(story)}`;
      copyText(text, btn, 'Copied!');
    });
  });

  renderHymnNav(hymn);
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
};

let leafletMap = null;
let markerClusterGroup = null;
const markersByKey = new Map();

// Normalizes a person-memorial pair or a standalone place into one shape
// so the map, list, and tour planner can render either without branching
// everywhere. `kind` is 'person' or 'place'.
function entryName(entry) {
  return entry.kind === 'person' ? entry.person.name : entry.place.name;
}

function entryProfileUrl(entry) {
  if (entry.kind === 'person') return `person.html?id=${escapeHtml(entry.person.id)}`;
  return entry.place.website || '';
}

function entryThumbHtml(entry, imgClass, placeholderClass) {
  if (entry.kind === 'person') {
    const person = entry.person;
    const initials = escapeHtml(getInitials(person.name));
    if (person.image) {
      const imgSrc = `images/portraits/${escapeHtml(person.image.file)}`;
      return `<img class="${imgClass}" src="${imgSrc}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;${placeholderClass}&quot;>${initials}</div>'">`;
    }
    return `<div class="${placeholderClass}">${initials}</div>`;
  }
  const style = memorialTypeStyle(entry.memorial.type);
  return `<div class="${placeholderClass} place-thumb" style="background:${style.color}">${memorialTypeIconSvg(entry.memorial.type, 20)}</div>`;
}

function getAllMapEntries() {
  const entries = [];
  allPeople.forEach(person => {
    (person.memorials || []).forEach((memorial, idx) => {
      entries.push({ kind: 'person', person, place: null, memorial, region: person.region, key: `person-${person.id}__${idx}` });
    });
  });
  allPlaces.forEach(place => {
    const memorial = { type: place.type, name: place.name, address: place.address, lat: place.lat, lng: place.lng, open_to_public: place.open_to_public };
    entries.push({ kind: 'place', person: null, place, memorial, region: place.region, key: `place-${place.id}` });
  });
  return entries;
}

function filterMemorialEntries(entries) {
  const { search } = mapState;
  if (!search) return entries;
  return entries.filter(entry => entryName(entry).toLowerCase().includes(search.toLowerCase()));
}

function mapPopupHtml(entry) {
  const { memorial } = entry;
  const isPerson = entry.kind === 'person';
  const name = entryName(entry);
  const portrait = entryThumbHtml(entry, 'map-popup-portrait', 'map-list-portrait-placeholder');
  const profileUrl = entryProfileUrl(entry);

  const titleHtml = profileUrl
    ? `<h3 class="map-popup-name"><a href="${escapeHtml(profileUrl)}" ${isPerson ? '' : 'target="_blank" rel="noopener noreferrer"'}>${escapeHtml(name)}</a></h3>`
    : `<h3 class="map-popup-name">${escapeHtml(name)}</h3>`;

  const subtitleHtml = isPerson
    ? `<div class="map-popup-memorial-name">${escapeHtml(memorial.name)}</div>`
    : (entry.place.description ? `<div class="map-popup-memorial-name">${escapeHtml(truncateSummary(entry.place.description, 160))}</div>` : '');

  const secondaryLink = isPerson
    ? `<a href="${escapeHtml(profileUrl)}">Profile</a>`
    : (entry.place.website ? `<a href="${escapeHtml(entry.place.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : '');

  return `
    <div class="map-popup">
      ${portrait}
      <div class="map-popup-body">
        <div class="map-popup-type">${escapeHtml(memorialTypeLabel(memorial.type))}</div>
        ${titleHtml}
        ${subtitleHtml}
        <div class="map-popup-address">${escapeHtml(memorial.address)}</div>
        ${accessBadgeHtml(memorial)}
        <div class="map-popup-links">
          <a href="${directionsUrl(memorial)}" target="_blank" rel="noopener noreferrer">Directions</a>
          ${secondaryLink}
        </div>
      </div>
    </div>
  `;
}

function renderMapMarkers(entries) {
  markerClusterGroup.clearLayers();
  markersByKey.clear();

  entries.forEach(entry => {
    const { memorial, key } = entry;
    const marker = L.marker([memorial.lat, memorial.lng], { icon: memorialTypeIcon(memorial.type) });
    marker.bindPopup(mapPopupHtml(entry));
    markerClusterGroup.addLayer(marker);
    markersByKey.set(key, marker);
  });
}

function renderMapLegend() {
  const el = document.getElementById('map-legend');
  if (!el) return;
  el.innerHTML = Object.keys(MEMORIAL_TYPE_LABELS).map(type => {
    const style = memorialTypeStyle(type);
    return `
      <span class="map-legend__item">
        <span class="map-legend__swatch" style="background:${style.color}">${memorialTypeIconSvg(type, 13)}</span>
        ${escapeHtml(memorialTypeLabel(type))}
      </span>
    `;
  }).join('');
}

function applyMapFilters() {
  const filtered = filterMemorialEntries(getAllMapEntries());
  renderMapMarkers(filtered);
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

  renderMapLegend();

  const params = new URLSearchParams(window.location.search);
  const personId = params.get('person');
  if (personId) {
    const person = allPeople.find(p => p.id === personId);
    if (person) mapState.search = person.name;
  }

  applyMapFilters();
  initMapJumpSearch();
  initTourPlanner();

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

let mapJumpMarker = null;

function initMapJumpSearch() {
  const form = document.getElementById('map-jump-form');
  const input = document.getElementById('map-jump-input');
  const status = document.getElementById('map-jump-status');
  if (!form || !input || !leafletMap) return;

  function setJumpStatus(message, isError) {
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) {
      setJumpStatus('Type a place name to jump to.', true);
      return;
    }
    setJumpStatus('Searching…');
    try {
      const result = await geocodeLocation(query);
      leafletMap.setView([result.lat, result.lng], 11);
      if (mapJumpMarker) leafletMap.removeLayer(mapJumpMarker);
      mapJumpMarker = L.marker([result.lat, result.lng]).addTo(leafletMap);
      const label = result.displayName.split(',').slice(0, 3).join(',');
      mapJumpMarker.bindPopup(escapeHtml(label)).openPopup();
      setJumpStatus(`Showing ${label}.`);
    } catch (err) {
      setJumpStatus(err.message || 'Could not find that place.', true);
    }
  });
}

// ============================================================
// Tour Planner (map page)
// ============================================================

const TRANSPORT_SPEED_KMH = { walk: 4.5, transit: 16, drive: 28 };
const TRANSPORT_DWELL_MIN = { walk: 12, transit: 12, drive: 10 };
const TRANSPORT_STOP_OVERHEAD_MIN = { walk: 0, transit: 4, drive: 5 };
const TRANSPORT_LABELS = { walk: 'on foot', transit: 'by public transport', drive: 'by car' };

const tourState = {
  center: null,
  centerLabel: '',
  route: null,
  stops: [],
  radiusKm: 5,
  transport: 'walk',
  startMinutes: 9 * 60,
  durationHours: 3,
  includeAppointment: false,
};

let tourLayerGroup = null;
const tourMarkersByKey = new Map();
const SAVED_TOURS_KEY = 'lof-saved-tours';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatClock(minutesOfDay) {
  const total = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseClockToMinutes(value, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!m) return fallback;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Geocoding service unavailable');
  const results = await res.json();
  if (!results.length) throw new Error(`Couldn't find "${query}"`);
  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}

function buildTourRoute({ center, radiusKm, transport, budgetMinutes, includeAppointment }) {
  const speed = TRANSPORT_SPEED_KMH[transport];
  const dwell = TRANSPORT_DWELL_MIN[transport];
  const overhead = TRANSPORT_STOP_OVERHEAD_MIN[transport];

  const candidates = getAllMapEntries()
    .filter(({ memorial }) => typeof memorial.lat === 'number' && typeof memorial.lng === 'number')
    .filter(({ memorial }) => includeAppointment || memorial.open_to_public !== false)
    .map(entry => ({ ...entry, distFromCenter: haversineKm(center.lat, center.lng, entry.memorial.lat, entry.memorial.lng) }))
    .filter(entry => entry.distFromCenter <= radiusKm);

  const remaining = candidates.slice();
  const stops = [];
  let currentLat = center.lat;
  let currentLng = center.lng;
  let elapsedMinutes = 0;
  let totalKm = 0;

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((entry, i) => {
      const d = haversineKm(currentLat, currentLng, entry.memorial.lat, entry.memorial.lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    const next = remaining[bestIdx];
    const legMinutes = (bestDist / speed) * 60 + overhead;
    const arrivalMinutes = elapsedMinutes + legMinutes;
    const departureMinutes = arrivalMinutes + dwell;

    if (stops.length > 0 && departureMinutes > budgetMinutes) break;

    stops.push({ ...next, legKm: bestDist, legMinutes, arrivalMinutes, departureMinutes });
    elapsedMinutes = departureMinutes;
    totalKm += bestDist;
    remaining.splice(bestIdx, 1);
    currentLat = next.memorial.lat;
    currentLng = next.memorial.lng;
  }

  return { stops, totalKm, totalMinutes: elapsedMinutes };
}

// Recomputes arrival/departure/leg-distance for a manually-ordered stop list
// (used after reorder/add/remove, as opposed to buildTourRoute's initial
// nearest-neighbour selection with a time budget cutoff).
function computeStopsTiming(stopsOrder, center, transport) {
  const speed = TRANSPORT_SPEED_KMH[transport];
  const dwell = TRANSPORT_DWELL_MIN[transport];
  const overhead = TRANSPORT_STOP_OVERHEAD_MIN[transport];

  let currentLat = center.lat;
  let currentLng = center.lng;
  let elapsedMinutes = 0;
  let totalKm = 0;

  const stops = stopsOrder.map(entry => {
    const { memorial } = entry;
    const legKm = haversineKm(currentLat, currentLng, memorial.lat, memorial.lng);
    const legMinutes = (legKm / speed) * 60 + overhead;
    const arrivalMinutes = elapsedMinutes + legMinutes;
    const departureMinutes = arrivalMinutes + dwell;
    elapsedMinutes = departureMinutes;
    totalKm += legKm;
    currentLat = memorial.lat;
    currentLng = memorial.lng;
    return { ...entry, legKm, legMinutes, arrivalMinutes, departureMinutes };
  });

  return { stops, totalKm, totalMinutes: elapsedMinutes };
}

function rebuildRouteFromStops() {
  tourState.route = (tourState.center && tourState.stops.length)
    ? computeStopsTiming(tourState.stops, tourState.center, tourState.transport)
    : { stops: [], totalKm: 0, totalMinutes: 0 };
  renderTourResults();
  drawTourOnMap();
}

function commitStopOrder(newOrderIndices) {
  tourState.stops = newOrderIndices.map(i => tourState.stops[i]);
  rebuildRouteFromStops();
}

function removeStop(index) {
  tourState.stops.splice(index, 1);
  rebuildRouteFromStops();
}

function startStopDrag(li, e) {
  if (!li) return;
  e.preventDefault();
  const listEl = li.parentElement;
  const startY = e.clientY;
  let offset = 0;

  li.setPointerCapture(e.pointerId);
  li.classList.add('tour-stop-item--dragging');
  li.style.position = 'relative';
  li.style.zIndex = '10';

  const applyTransform = clientY => {
    li.style.transform = `translateY(${clientY - startY + offset}px)`;
  };

  const onMove = ev => {
    applyTransform(ev.clientY);

    let swapped = true;
    while (swapped) {
      swapped = false;
      const liRect = li.getBoundingClientRect();
      const liMid = liRect.top + liRect.height / 2;
      const items = Array.from(listEl.children);
      const liIndexNow = items.indexOf(li);
      for (const sib of items) {
        if (sib === li) continue;
        const sibIndexNow = items.indexOf(sib);
        const sibRect = sib.getBoundingClientRect();
        const sibMid = sibRect.top + sibRect.height / 2;
        if (sibIndexNow > liIndexNow && liMid > sibMid) {
          listEl.insertBefore(li, sib.nextSibling);
          offset -= sibRect.height;
          applyTransform(ev.clientY);
          swapped = true;
          break;
        }
        if (sibIndexNow < liIndexNow && liMid < sibMid) {
          listEl.insertBefore(li, sib);
          offset += sibRect.height;
          applyTransform(ev.clientY);
          swapped = true;
          break;
        }
      }
    }
  };

  const onUp = ev => {
    li.releasePointerCapture(ev.pointerId);
    li.classList.remove('tour-stop-item--dragging');
    li.style.transform = '';
    li.style.position = '';
    li.style.zIndex = '';
    li.removeEventListener('pointermove', onMove);
    li.removeEventListener('pointerup', onUp);
    li.removeEventListener('pointercancel', onUp);
    const newOrderIndices = Array.from(listEl.children).map(el => parseInt(el.dataset.index, 10));
    commitStopOrder(newOrderIndices);
  };

  li.addEventListener('pointermove', onMove);
  li.addEventListener('pointerup', onUp);
  li.addEventListener('pointercancel', onUp);
}

async function addCustomStop() {
  const nameInput = document.getElementById('tour-add-name');
  const addressInput = document.getElementById('tour-add-address');
  const name = nameInput ? nameInput.value.trim() : '';
  const address = addressInput ? addressInput.value.trim() : '';

  if (!tourState.center) {
    setTourStatus('Set a starting location first.', true);
    return;
  }
  if (!name || !address) {
    setTourStatus('Enter both a name and an address for the new stop.', true);
    return;
  }

  setTourStatus('Locating new stop…');
  try {
    const result = await geocodeLocation(address);
    tourState.stops.push({
      kind: 'place',
      person: null,
      place: { name, description: '', website: '' },
      memorial: {
        type: 'custom',
        name: 'Custom stop',
        address: result.displayName.split(',').slice(0, 4).join(','),
        lat: result.lat,
        lng: result.lng,
        open_to_public: true,
      },
      region: null,
      key: `custom-${Date.now()}`,
    });
    rebuildRouteFromStops();
    if (nameInput) nameInput.value = '';
    if (addressInput) addressInput.value = '';
    setTourStatus(`Added "${name}" to the tour.`);
  } catch (err) {
    setTourStatus(err.message || 'Could not find that address.', true);
  }
}

function setTourStatus(msg, isError) {
  const el = document.getElementById('tour-status');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('tour-planner__status--error', Boolean(isError));
}

function numberedTourIcon(n) {
  return L.divIcon({
    className: 'tour-stop-icon',
    html: `<span>${n}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function focusMapOnTourCenter(zoom = 13) {
  if (!leafletMap || !tourState.center) return;

  if (tourLayerGroup) {
    tourLayerGroup.clearLayers();
    const centerMarker = L.marker([tourState.center.lat, tourState.center.lng], {
      icon: L.divIcon({ className: 'tour-center-icon', html: '<span>S</span>', iconSize: [26, 26], iconAnchor: [13, 13] }),
    }).bindPopup(`<strong>Starting point</strong><br>${escapeHtml(tourState.centerLabel)}`);
    tourLayerGroup.addLayer(centerMarker);
  }

  leafletMap.setView([tourState.center.lat, tourState.center.lng], zoom);
  document.getElementById('tour-planner').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function drawTourOnMap() {
  if (!tourLayerGroup) return;
  tourLayerGroup.clearLayers();
  tourMarkersByKey.clear();

  const { center, route } = tourState;
  if (!center || !route || !route.stops.length) return;

  const centerMarker = L.marker([center.lat, center.lng], {
    icon: L.divIcon({ className: 'tour-center-icon', html: '<span>S</span>', iconSize: [26, 26], iconAnchor: [13, 13] }),
  }).bindPopup(`<strong>Starting point</strong><br>${escapeHtml(tourState.centerLabel)}`);
  tourLayerGroup.addLayer(centerMarker);

  const latlngs = [[center.lat, center.lng]];
  route.stops.forEach((stop, i) => {
    const { memorial } = stop;
    const profileUrl = entryProfileUrl(stop);
    const isPerson = stop.kind === 'person';
    const nameHtml = profileUrl
      ? `<a href="${escapeHtml(profileUrl)}" ${isPerson ? '' : 'target="_blank" rel="noopener noreferrer"'}>${escapeHtml(entryName(stop))}</a>`
      : escapeHtml(entryName(stop));
    latlngs.push([memorial.lat, memorial.lng]);
    const marker = L.marker([memorial.lat, memorial.lng], { icon: numberedTourIcon(i + 1) });
    marker.bindPopup(`
      <div class="map-popup">
        <div class="map-popup-body">
          <div class="map-popup-type">Stop ${i + 1} &middot; arrive ~${formatClock(tourState.startMinutes + stop.arrivalMinutes)}</div>
          <h3 class="map-popup-name">${nameHtml}</h3>
          <div class="map-popup-memorial-name">${escapeHtml(memorial.name)}</div>
          <div class="map-popup-address">${escapeHtml(memorial.address)}</div>
          ${accessBadgeHtml(memorial)}
        </div>
      </div>
    `);
    tourLayerGroup.addLayer(marker);
    tourMarkersByKey.set(`tour-${i}`, marker);
  });

  const polyline = L.polyline(latlngs, { color: '#a8832a', weight: 3, dashArray: '6,8' });
  tourLayerGroup.addLayer(polyline);

  leafletMap.fitBounds(polyline.getBounds().pad(0.2));
}

function toggleTourActionButtons(enabled) {
  const actionsEl = document.querySelector('.tour-results__actions');
  if (actionsEl) actionsEl.hidden = !enabled;
}

function renderTourResults() {
  const resultsEl = document.getElementById('tour-results');
  const summaryEl = document.getElementById('tour-summary');
  const listEl = document.getElementById('tour-stop-list');
  const clearBtn = document.getElementById('tour-clear-btn');
  if (!resultsEl || !summaryEl || !listEl) return;

  if (!tourState.center) {
    resultsEl.hidden = true;
    if (clearBtn) clearBtn.hidden = true;
    return;
  }

  resultsEl.hidden = false;

  const { route, startMinutes } = tourState;
  const stops = (route && route.stops) || [];

  if (!stops.length) {
    summaryEl.innerHTML = 'No stops yet — generate a tour above, or add a stop manually below.';
    listEl.innerHTML = '';
    if (clearBtn) clearBtn.hidden = true;
    toggleTourActionButtons(false);
    updateMapExportLinks();
    return;
  }

  const finishClock = formatClock(startMinutes + route.totalMinutes);
  const startClock = formatClock(startMinutes);
  summaryEl.innerHTML = `<strong>${stops.length}</strong> ${stops.length === 1 ? 'stop' : 'stops'} &middot; ` +
    `~${route.totalKm.toFixed(1)} km &middot; ${startClock} &rarr; ~${finishClock}`;

  listEl.innerHTML = stops.map((stop, i) => {
    const { memorial } = stop;
    const portrait = entryThumbHtml(stop, 'map-list-portrait', 'map-list-portrait-placeholder');
    const profileUrl = entryProfileUrl(stop);
    const isPerson = stop.kind === 'person';
    const nameHtml = profileUrl
      ? `<a href="${escapeHtml(profileUrl)}" ${isPerson ? '' : 'target="_blank" rel="noopener noreferrer"'}>${escapeHtml(entryName(stop))}</a>`
      : escapeHtml(entryName(stop));
    const arrival = formatClock(startMinutes + stop.arrivalMinutes);

    return `
      <li class="tour-stop-item" data-index="${i}">
        <button type="button" class="tour-stop-handle" aria-label="Drag to reorder" title="Drag to reorder">&#8942;&#8942;</button>
        <span class="tour-stop-number">${i + 1}</span>
        ${portrait}
        <div>
          <div class="map-list-name">${nameHtml}</div>
          <div class="map-list-meta">${escapeHtml(memorialTypeLabel(memorial.type))} &middot; ${escapeHtml(memorial.name)} ${accessBadgeHtml(memorial)}</div>
          <div class="map-list-meta">${escapeHtml(memorial.address)}</div>
          <div class="tour-stop-timing">Arrive ~${arrival} &middot; ${stop.legKm.toFixed(1)} km from previous stop</div>
        </div>
        <button type="button" class="tour-stop-remove" data-tour-action="remove" data-index="${i}" aria-label="Remove stop" title="Remove">&#10005;</button>
      </li>
    `;
  }).join('');

  if (clearBtn) clearBtn.hidden = false;
  toggleTourActionButtons(true);
  updateMapExportLinks();
}

function buildTourPromptText() {
  const { center, centerLabel, route, radiusKm, transport, startMinutes, durationHours } = tourState;
  if (!center || !route || !route.stops.length) return '';

  const transportLabel = TRANSPORT_LABELS[transport];
  const lines = [];
  lines.push(`I'm planning a Christian heritage tour ${transportLabel} near ${centerLabel}, starting at ${formatClock(startMinutes)} for about ${durationHours} hour${durationHours === 1 ? '' : 's'}, within roughly ${radiusKm} km.`);
  lines.push('');
  lines.push('Here are the stops, in a suggested visiting order (nearest-neighbour route) — a mix of memorials to specific people and general places of Christian interest. Please suggest a refined order if there is a better one, a short narrative connecting each stop to its history and significance, and any practical notes (opening hours to check, appointment-only archives, etc.):');
  lines.push('');
  route.stops.forEach((stop, i) => {
    const { memorial } = stop;
    const accessNote = memorial.open_to_public === false ? ' [by appointment — not casual walk-in]' : '';
    if (stop.kind === 'person') {
      const person = stop.person;
      lines.push(`${i + 1}. ${memorial.name} (${memorialTypeLabel(memorial.type)}) — ${person.name} (${formatYears(person)}) — ${memorial.address}${accessNote}`);
      const bio = person.source_summary ? truncateSummary(person.source_summary, 140) : `${person.nationality} ${person.tradition}.`;
      lines.push(`   ${bio}`);
    } else {
      const place = stop.place;
      lines.push(`${i + 1}. ${place.name} (${memorialTypeLabel(memorial.type)}) — ${memorial.address}${accessNote}`);
      if (place.description) lines.push(`   ${truncateSummary(place.description, 140)}`);
    }
  });
  lines.push('');
  lines.push(`Starting point: ${centerLabel}`);
  lines.push(`Transport: ${transportLabel}. Time budget: ${durationHours} hour(s) from ${formatClock(startMinutes)}.`);

  return lines.join('\n');
}

function generateTour() {
  if (!tourState.center) {
    setTourStatus('Please set a starting location first — search for one or use your location.', true);
    return;
  }

  const radiusSel = document.getElementById('tour-radius');
  const transportSel = document.getElementById('tour-transport');
  const startInput = document.getElementById('tour-start');
  const durationSel = document.getElementById('tour-duration');
  const includeAppointmentCheckbox = document.getElementById('tour-include-appointment');

  tourState.radiusKm = radiusSel ? parseFloat(radiusSel.value) : 5;
  tourState.transport = transportSel ? transportSel.value : 'walk';
  tourState.startMinutes = parseClockToMinutes(startInput ? startInput.value : '', 9 * 60);
  tourState.durationHours = durationSel ? parseFloat(durationSel.value) : 3;
  tourState.includeAppointment = includeAppointmentCheckbox ? includeAppointmentCheckbox.checked : false;

  const route = buildTourRoute({
    center: tourState.center,
    radiusKm: tourState.radiusKm,
    transport: tourState.transport,
    budgetMinutes: tourState.durationHours * 60,
    includeAppointment: tourState.includeAppointment,
  });

  tourState.route = route;
  tourState.stops = route.stops.map(s => ({ ...s }));

  if (!route.stops.length) {
    setTourStatus(`No memorials or places found within ${tourState.radiusKm} km of ${tourState.centerLabel}. Try a larger radius.`, true);
    renderTourResults();
    drawTourOnMap();
    return;
  }

  setTourStatus(`Found ${route.stops.length} ${route.stops.length === 1 ? 'stop' : 'stops'} near ${tourState.centerLabel}.`);
  renderTourResults();
  drawTourOnMap();
}

function clearTour() {
  tourState.route = null;
  tourState.stops = [];
  setTourStatus('');
  renderTourResults();
  drawTourOnMap();
}

// ============================================================
// Tour Planner — save, share, print, export
// ============================================================

function stopToPortable(entry) {
  if (entry.kind === 'person') {
    return { kind: 'person', personId: entry.person.id, memorialIndex: (entry.person.memorials || []).indexOf(entry.memorial) };
  }
  if (entry.memorial.type === 'custom') {
    return { kind: 'custom', name: entry.place.name, address: entry.memorial.address, lat: entry.memorial.lat, lng: entry.memorial.lng };
  }
  return { kind: 'placeRef', placeId: entry.place.id };
}

function portableToStop(portable) {
  if (portable.kind === 'person') {
    const person = allPeople.find(p => p.id === portable.personId);
    const memorial = person && (person.memorials || [])[portable.memorialIndex];
    if (!memorial) return null;
    return { kind: 'person', person, place: null, memorial, region: person.region, key: `person-${person.id}__${portable.memorialIndex}` };
  }
  if (portable.kind === 'placeRef') {
    const place = allPlaces.find(p => p.id === portable.placeId);
    if (!place) return null;
    const memorial = { type: place.type, name: place.name, address: place.address, lat: place.lat, lng: place.lng, open_to_public: place.open_to_public };
    return { kind: 'place', person: null, place, memorial, region: place.region, key: `place-${place.id}` };
  }
  if (portable.kind === 'custom') {
    return {
      kind: 'place',
      person: null,
      place: { name: portable.name, description: '', website: '' },
      memorial: { type: 'custom', name: 'Custom stop', address: portable.address, lat: portable.lat, lng: portable.lng, open_to_public: true },
      region: null,
      key: `custom-${portable.lat}-${portable.lng}-${portable.name}`,
    };
  }
  return null;
}

function serializeTourState() {
  return {
    center: tourState.center,
    centerLabel: tourState.centerLabel,
    radiusKm: tourState.radiusKm,
    transport: tourState.transport,
    startMinutes: tourState.startMinutes,
    durationHours: tourState.durationHours,
    includeAppointment: tourState.includeAppointment,
    stops: tourState.stops.map(stopToPortable),
  };
}

function encodeTourData(data) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function decodeTourData(encoded) {
  return JSON.parse(decodeURIComponent(atob(encoded)));
}

function applyTourData(data) {
  tourState.center = data.center || null;
  tourState.centerLabel = data.centerLabel || '';
  tourState.radiusKm = data.radiusKm || 5;
  tourState.transport = data.transport || 'walk';
  tourState.startMinutes = typeof data.startMinutes === 'number' ? data.startMinutes : 9 * 60;
  tourState.durationHours = data.durationHours || 3;
  tourState.includeAppointment = Boolean(data.includeAppointment);
  tourState.stops = (data.stops || []).map(portableToStop).filter(Boolean);

  const locationInput = document.getElementById('tour-location');
  const radiusSel = document.getElementById('tour-radius');
  const transportSel = document.getElementById('tour-transport');
  const startInput = document.getElementById('tour-start');
  const durationSel = document.getElementById('tour-duration');
  const includeAppointmentCheckbox = document.getElementById('tour-include-appointment');
  if (locationInput) locationInput.value = tourState.centerLabel || '';
  if (radiusSel) radiusSel.value = String(tourState.radiusKm);
  if (transportSel) transportSel.value = tourState.transport;
  if (startInput) startInput.value = formatClock(tourState.startMinutes);
  if (durationSel) durationSel.value = String(tourState.durationHours);
  if (includeAppointmentCheckbox) includeAppointmentCheckbox.checked = tourState.includeAppointment;

  rebuildRouteFromStops();
  if (!tourState.stops.length) focusMapOnTourCenter();
}

function currentShareUrl() {
  const encoded = encodeTourData(serializeTourState());
  return `${location.origin}${location.pathname}#tour=${encoded}`;
}

function getSavedTours() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_TOURS_KEY) || '[]');
  } catch (err) {
    return [];
  }
}

function setSavedTours(list) {
  try {
    localStorage.setItem(SAVED_TOURS_KEY, JSON.stringify(list));
  } catch (err) { /* storage unavailable — saving is best-effort */ }
}

function renderSavedTours() {
  const wrap = document.getElementById('tour-saved');
  const listEl = document.getElementById('tour-saved-list');
  if (!wrap || !listEl) return;

  const tours = getSavedTours();
  if (!tours.length) {
    wrap.hidden = true;
    listEl.innerHTML = '';
    return;
  }

  wrap.hidden = false;
  listEl.innerHTML = tours.map(t => `
    <li class="tour-saved-item">
      <span class="tour-saved-label">${escapeHtml(t.label)}</span>
      <span class="tour-saved-date">${escapeHtml(new Date(t.savedAt).toLocaleDateString())}</span>
      <button type="button" class="btn btn-secondary" data-open-tour="${escapeHtml(t.id)}">Open</button>
      <button type="button" class="btn btn-secondary" data-delete-tour="${escapeHtml(t.id)}">Delete</button>
    </li>
  `).join('');
}

function saveTourPrompt() {
  if (!tourState.center) {
    setTourStatus('Set a starting location first.', true);
    return;
  }
  const defaultLabel = tourState.centerLabel ? `Tour near ${tourState.centerLabel}` : 'My tour';
  const label = window.prompt('Name this tour:', defaultLabel);
  if (!label) return;

  const list = getSavedTours();
  list.unshift({ id: `t${Date.now()}`, label, savedAt: new Date().toISOString(), data: serializeTourState() });
  setSavedTours(list.slice(0, 30));
  renderSavedTours();
  setTourStatus(`Saved "${label}".`);
}

async function shareTour(button) {
  if (!tourState.center) {
    setTourStatus('Set a starting location first.', true);
    return;
  }
  const url = currentShareUrl();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Lives of Faith — Heritage Tour', text: 'A heritage tour I planned on Lives of Faith:', url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  copyText(url, button, 'Link copied — paste it into a text or email!');
}

function buildTourPrintHtml() {
  const { centerLabel, route, transport, startMinutes, radiusKm } = tourState;
  const stops = (route && route.stops) || [];
  const transportLabel = TRANSPORT_LABELS[transport];

  const rows = stops.map((stop, i) => {
    const { memorial } = stop;
    const arrival = formatClock(startMinutes + stop.arrivalMinutes);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${escapeHtml(entryName(stop))}</strong><br>
          <span class="muted">${escapeHtml(memorialTypeLabel(memorial.type))} &middot; ${escapeHtml(memorial.name)}</span><br>
          <span class="muted">${escapeHtml(memorial.address)}</span>
        </td>
        <td>${arrival}</td>
        <td>${stop.legKm.toFixed(1)} km</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Heritage Tour — ${escapeHtml(centerLabel)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #222; margin: 2rem; }
  h1 { font-size: 1.4rem; margin-bottom: 0.2rem; }
  .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.2rem; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 0.5rem 0.6rem; border-bottom: 1px solid #ddd; font-size: 0.92rem; }
  td:first-child { font-weight: bold; width: 2rem; }
  .muted { color: #666; font-size: 0.85rem; }
  footer { margin-top: 2rem; font-size: 0.78rem; color: #888; }
  @media print { body { margin: 1cm; } }
</style>
</head><body>
  <h1>Heritage Tour — ${escapeHtml(centerLabel)}</h1>
  <div class="meta">
    Starting ${escapeHtml(formatClock(startMinutes))}, ${escapeHtml(transportLabel)}, within ~${radiusKm} km &middot;
    ${stops.length} stop${stops.length === 1 ? '' : 's'} &middot; ~${route.totalKm.toFixed(1)} km total
  </div>
  <table>
    <thead><tr><td>#</td><td>Stop</td><td>Arrive</td><td>Leg</td></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>Generated by Lives of Faith (livesoffaith.org) — memorial locations are researched from public sources and may be approximate.</footer>
</body></html>`;
}

function printTour() {
  if (!tourState.route || !tourState.route.stops.length) {
    setTourStatus('Generate or add stops before printing.', true);
    return;
  }
  const win = window.open('', '_blank');
  if (!win) {
    setTourStatus('Please allow pop-ups to print the tour.', true);
    return;
  }
  win.document.write(buildTourPrintHtml());
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 200);
}

function buildGoogleMapsUrl() {
  const { center, route, transport } = tourState;
  if (!center || !route || !route.stops.length) return '';
  const travelmode = transport === 'drive' ? 'driving' : transport === 'transit' ? 'transit' : 'walking';
  const last = route.stops[route.stops.length - 1];
  const middle = route.stops.slice(0, -1);
  const params = new URLSearchParams({
    api: '1',
    origin: `${center.lat},${center.lng}`,
    destination: `${last.memorial.lat},${last.memorial.lng}`,
    travelmode,
  });
  if (middle.length) params.set('waypoints', middle.map(s => `${s.memorial.lat},${s.memorial.lng}`).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildAppleMapsUrl() {
  const { center, route, transport } = tourState;
  if (!center || !route || !route.stops.length) return '';
  const mode = transport === 'drive' ? 'driving' : transport === 'transit' ? 'transit' : 'walking';
  const last = route.stops[route.stops.length - 1];
  const middle = route.stops.slice(0, -1);
  const params = new URLSearchParams({
    source: `${center.lat},${center.lng}`,
    destination: `${last.memorial.lat},${last.memorial.lng}`,
    mode,
  });
  middle.forEach(stop => params.append('waypoint', `${stop.memorial.lat},${stop.memorial.lng}`));
  return `https://maps.apple.com/directions?${params.toString()}`;
}

function updateMapExportLinks() {
  const gEl = document.getElementById('tour-gmaps-link');
  const aEl = document.getElementById('tour-amaps-link');
  const hasStops = Boolean(tourState.route && tourState.route.stops.length);
  if (gEl) {
    gEl.href = hasStops ? buildGoogleMapsUrl() : '#';
    gEl.setAttribute('aria-disabled', hasStops ? 'false' : 'true');
  }
  if (aEl) {
    aEl.href = hasStops ? buildAppleMapsUrl() : '#';
    aEl.setAttribute('aria-disabled', hasStops ? 'false' : 'true');
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function tourFileBaseName() {
  const slug = (tourState.centerLabel || 'tour').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `heritage-tour-${slug || 'tour'}`;
}

function exportTourHtml() {
  if (!tourState.route || !tourState.route.stops.length) {
    setTourStatus('Generate or add stops before exporting.', true);
    return;
  }
  downloadBlob(new Blob([buildTourPrintHtml()], { type: 'text/html' }), `${tourFileBaseName()}.html`);
}

// Word doesn't read arbitrary HTML as a document unless it carries the
// mso-office namespaces — adding them (and an .doc extension) is enough
// for Word/LibreOffice to open it as a real document, no docx library needed.
function buildTourWordHtml() {
  return buildTourPrintHtml().replace(
    '<html>',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
  );
}

function exportTourWord() {
  if (!tourState.route || !tourState.route.stops.length) {
    setTourStatus('Generate or add stops before exporting.', true);
    return;
  }
  downloadBlob(new Blob(['﻿', buildTourWordHtml()], { type: 'application/msword' }), `${tourFileBaseName()}.doc`);
}

function exportTourPdf() {
  if (!tourState.route || !tourState.route.stops.length) {
    setTourStatus('Generate or add stops before exporting.', true);
    return;
  }
  if (!window.jspdf) {
    setTourStatus('PDF export library failed to load — check your connection and try again.', true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const { route, transport, startMinutes, radiusKm, centerLabel } = tourState;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Heritage Tour — ${centerLabel}`, margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Starting ${formatClock(startMinutes)}, ${TRANSPORT_LABELS[transport]}, within ~${radiusKm} km — ` +
    `${route.stops.length} stop${route.stops.length === 1 ? '' : 's'}, ~${route.totalKm.toFixed(1)} km total`,
    margin, y
  );
  y += 24;

  route.stops.forEach((stop, i) => {
    const { memorial } = stop;
    const arrival = formatClock(startMinutes + stop.arrivalMinutes);
    const detailLines = doc.splitTextToSize(
      `${memorialTypeLabel(memorial.type)} · ${memorial.name} — ${memorial.address}`,
      maxWidth
    );
    const blockHeight = 14 + detailLines.length * 11 + 20;
    if (y + blockHeight > pageHeight - margin) { doc.addPage(); y = margin; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${i + 1}. ${entryName(stop)}`, margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(detailLines, margin, y);
    y += detailLines.length * 11;
    doc.text(`Arrive ~${arrival} · ${stop.legKm.toFixed(1)} km from previous stop`, margin, y);
    y += 20;
  });

  doc.save(`${tourFileBaseName()}.pdf`);
}

function initTourPlanner() {
  if (!document.getElementById('tour-planner')) return;

  tourLayerGroup = L.layerGroup().addTo(leafletMap);

  const locationInput = document.getElementById('tour-location');
  const locateBtn = document.getElementById('tour-locate-btn');
  const geolocateBtn = document.getElementById('tour-geolocate-btn');
  const generateBtn = document.getElementById('tour-generate-btn');
  const clearBtn = document.getElementById('tour-clear-btn');
  const copyPromptBtn = document.getElementById('tour-copy-prompt-btn');

  async function doLocate() {
    const query = locationInput ? locationInput.value.trim() : '';
    if (!query) {
      setTourStatus('Type a city or address to search for.', true);
      return;
    }
    setTourStatus('Searching…');
    try {
      const result = await geocodeLocation(query);
      tourState.center = { lat: result.lat, lng: result.lng };
      tourState.centerLabel = result.displayName.split(',').slice(0, 3).join(',');
      setTourStatus(`Starting point set: ${tourState.centerLabel}`);
      focusMapOnTourCenter();
      renderTourResults();
    } catch (err) {
      setTourStatus(err.message || 'Could not find that location.', true);
    }
  }

  if (locateBtn) locateBtn.addEventListener('click', doLocate);
  if (locationInput) {
    locationInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); doLocate(); }
    });
  }

  if (geolocateBtn) {
    geolocateBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        setTourStatus('Geolocation is not available in this browser.', true);
        return;
      }
      setTourStatus('Getting your location…');
      navigator.geolocation.getCurrentPosition(
        pos => {
          tourState.center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          tourState.centerLabel = 'your current location';
          if (locationInput) locationInput.value = '';
          setTourStatus('Starting point set to your current location.');
          focusMapOnTourCenter(14);
          renderTourResults();
        },
        err => setTourStatus(`Could not get your location: ${err.message}`, true)
      );
    });
  }

  if (generateBtn) generateBtn.addEventListener('click', generateTour);
  if (clearBtn) clearBtn.addEventListener('click', clearTour);

  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', () => {
      const text = buildTourPromptText();
      if (!text) return;
      copyText(text, copyPromptBtn, 'Prompt copied!');
    });
  }

  const stopListEl = document.getElementById('tour-stop-list');
  if (stopListEl) {
    stopListEl.addEventListener('click', e => {
      const btn = e.target.closest('button[data-tour-action="remove"]');
      if (!btn) return;
      removeStop(parseInt(btn.dataset.index, 10));
    });
    stopListEl.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.tour-stop-handle');
      if (!handle) return;
      startStopDrag(handle.closest('.tour-stop-item'), e);
    });
  }

  const addStopBtn = document.getElementById('tour-add-stop-btn');
  const addNameInput = document.getElementById('tour-add-name');
  const addAddressInput = document.getElementById('tour-add-address');
  if (addStopBtn) addStopBtn.addEventListener('click', () => addCustomStop());
  if (addAddressInput) {
    addAddressInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addCustomStop(); }
    });
  }
  if (addNameInput) {
    addNameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addCustomStop(); }
    });
  }

  const saveBtn = document.getElementById('tour-save-btn');
  const shareBtn = document.getElementById('tour-share-btn');
  const printBtn = document.getElementById('tour-print-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveTourPrompt);
  if (shareBtn) shareBtn.addEventListener('click', () => shareTour(shareBtn));
  if (printBtn) printBtn.addEventListener('click', printTour);

  const exportMenu = document.querySelector('.tour-export-menu');
  const exportHtmlBtn = document.getElementById('tour-export-html-btn');
  const exportPdfBtn = document.getElementById('tour-export-pdf-btn');
  const exportWordBtn = document.getElementById('tour-export-word-btn');
  const closeExportMenu = () => { if (exportMenu) exportMenu.open = false; };
  if (exportHtmlBtn) exportHtmlBtn.addEventListener('click', () => { exportTourHtml(); closeExportMenu(); });
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => { exportTourPdf(); closeExportMenu(); });
  if (exportWordBtn) exportWordBtn.addEventListener('click', () => { exportTourWord(); closeExportMenu(); });
  document.addEventListener('click', e => {
    if (exportMenu && exportMenu.open && !exportMenu.contains(e.target)) exportMenu.open = false;
  });

  const savedListEl = document.getElementById('tour-saved-list');
  if (savedListEl) {
    savedListEl.addEventListener('click', e => {
      const openBtn = e.target.closest('button[data-open-tour]');
      const deleteBtn = e.target.closest('button[data-delete-tour]');
      if (openBtn) {
        const tour = getSavedTours().find(t => t.id === openBtn.dataset.openTour);
        if (tour) {
          applyTourData(tour.data);
          setTourStatus(`Loaded "${tour.label}".`);
        }
      } else if (deleteBtn) {
        setSavedTours(getSavedTours().filter(t => t.id !== deleteBtn.dataset.deleteTour));
        renderSavedTours();
      }
    });
  }

  renderSavedTours();

  // Parsed with a plain regex rather than URLSearchParams — the base64
  // payload can contain literal '+' characters, which URLSearchParams
  // (application/x-www-form-urlencoded semantics) would decode as spaces.
  const hashMatch = /^#tour=(.+)$/.exec(location.hash);
  if (hashMatch) {
    try {
      applyTourData(decodeTourData(hashMatch[1]));
      setTourStatus(`Loaded shared tour${tourState.centerLabel ? ': ' + tourState.centerLabel : ''}.`);
    } catch (err) {
      console.error('Failed to load tour from link:', err);
    }
  }
}

// ============================================================
// Boot
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('memorial-map')) {
    await Promise.all([loadPeople(), loadPlaces()]);
    initMapPage();
    return;
  }

  await Promise.all([loadPeople(), loadPageviews(), loadQuiz(), loadVerses(), loadHymns()]);

  if (document.getElementById('person-grid')) {
    initIndexPage();
  } else if (document.getElementById('person-content')) {
    initPersonPage();
  } else if (document.getElementById('hymn-grid')) {
    initHymnsIndexPage();
  } else if (document.getElementById('hymn-content')) {
    initHymnPage();
  } else if (document.getElementById('quiz-print-questions')) {
    initQuizPrintPage();
  }
});
