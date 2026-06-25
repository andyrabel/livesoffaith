# Faith Heritage Website — Claude Code Instructions

## Project Overview

Build a static GitHub Pages website profiling notable Christians throughout history —
hymn writers, theologians, missionaries, martyrs, and believers from all eras and regions.
The site serves worship leaders, Bible teachers, and families seeking Christ-centred
biographical content for use in services, devotions, and family worship.

---

## Absolute Content Rules

These rules are non-negotiable and must be applied to every piece of generated content
without exception.

### Theological Requirements
- Every story must point to **Christ**, not to the individual
- Every story must contain a clear thread of **salvation by grace through faith alone**,
  not by works
- No hero-worship, hagiography, or romanticisation of any person
- Tone is reverent, instructive, and worshipful — never sensational

### Factual Accuracy
- All biographical content must be grounded in **Wikipedia and/or the sources listed**
  in the Sources section below
- Do **not** invent, embellish, or speculate beyond what sources confirm
- If a fact is uncertain, omit it or flag it explicitly
- AI generates from source facts — it elaborates style, never invents substance

### Inclusion
- Deliberately global scope — do not default to British or American figures
- Actively include Africa, Asia, Latin America, Eastern Europe, and the Global South
- Examples: Wang Ming Dao, Samuel Ajayi Crowther, John Sung, Sadhu Sundar Singh,
  Pandita Ramabai, Allen Gardiner, Robert Moffat

### Exclusions — Never include anyone from the following
- Roman Catholics
- Mormons / LDS
- Jehovah's Witnesses
- Christian Scientists
- Word of Faith / prosperity gospel figures
- Oneness Pentecostals
- Any other cult, sect, or heterodox movement

### Flagged Figures
Some figures are theologically orthodox but have specific areas of concern
(e.g. C.S. Lewis — purgatory views; Watchman Nee — ecclesiology; Sadhu Sundar Singh —
mystical claims). These may be included but must:
- Have `"flagged": true` in their JSON entry
- Have a `"footnote"` field with a specific, factual, charitable note
- Be marked for mandatory human review before publishing
- Display the footnote visibly at the bottom of their page

---

## Exclusion Vetting Checklist

Before generating content for any person, confirm all of the following:
1. Trinitarian orthodox faith (Father, Son, Holy Spirit)
2. Salvation by grace through faith in Christ's atoning work — not by sacrament or works
3. No affiliation with excluded groups listed above
4. If any doubt exists — flag for human review, do not silently include

---

## Two Story Versions Per Person

### Adult Version
- Richer theological and historical context
- May reference doctrine, historical setting, church history
- Suitable for use in adult Bible study or worship service
- Approximately 300–500 words

### Family Version
- Simpler vocabulary, narrative-focused
- Engaging for children aged 8–14
- Avoids complex theology but retains the gospel thread clearly
- Approximately 150–250 words

Both versions must:
- Be factually accurate to the sourced material
- Point to Christ and contain a salvation-by-faith thread
- Avoid invented dialogue or unverified anecdotes

---

## Image Requirements

- **All images are AI-generated — no third-party images are used under any circumstances**
- Do not use Wikipedia portraits, Wikimedia images, or any external image regardless
  of perceived copyright or public domain status
- Generate portrait images that are historically accurate in dress, setting, and era
- Use Wikipedia descriptions and known portrait references only as **prompt references**,
  never as source images
- Every image carries the caption exactly as follows:

  > AI-generated image — no copyright claimed

- Store the prompt used to generate each image in the JSON schema for reproducibility

---

## Human Review System

Every person entry has a review status stored in JSON:

```json
"review": {
  "human_reviewed": false,
  "reviewed_by": "",
  "reviewed_date": ""
}
```

On the rendered page this displays as a badge:
- ✅ Reviewed for accuracy — when `human_reviewed: true`
- ⚠️ AI-generated content — not yet human reviewed — when `human_reviewed: false`

The ⚠️ badge must be prominent and honest. Do not suppress or minimise it.
No content is ever published without one badge or the other being displayed.

---

## Copy to Clipboard

Every person page includes three copy buttons:
- **Copy Adult Story** — copies person name, dates, and adult story text
- **Copy Family Story** — copies person name, dates, and family story text
- **Copy Image** — copies the portrait image to clipboard using the Clipboard API

These buttons are intended for worship leaders copying content into presentations or
documents. Make them prominent and easy to find.

---

## JSON Schema — Person Entry

Each person is stored as a JSON object. The full schema is:

```json
{
  "id": "wang-ming-dao",
  "name": "Wang Ming Dao",
  "born": 1900,
  "died": 1991,
  "nationality": "Chinese",
  "era": "20th Century",
  "region": "Asia",
  "tradition": "Independent evangelical",
  "flagged": false,
  "footnote": "",
  "topics": ["perseverance", "suffering", "faithfulness", "persecution"],
  "hymns": [],
  "wikipedia_url": "https://en.wikipedia.org/wiki/Wang_Mingdao",
  "source_summary": "Brief factual summary extracted from Wikipedia",
  "adult_story": "...",
  "family_story": "...",
  "image": {
    "file": "wang-ming-dao.jpg",
    "prompt_used": "Photorealistic portrait of Wang Ming Dao, Chinese Christian pastor, early 20th century, wearing simple Chinese clothing, serious and dignified expression, historically accurate",
    "caption": "AI-generated image — no copyright claimed"
  },
  "review": {
    "human_reviewed": false,
    "reviewed_by": "",
    "reviewed_date": ""
  }
}
```

---

## Site Architecture

The site is a **flat static site** hosted on GitHub Pages. No backend, no database,
no server-side code. All data lives in JSON files. All filtering is client-side JavaScript.

### Directory Structure

```
/                          ← site root
├── index.html             ← home page + search/filter UI
├── person.html            ← single person template page
├── about.html             ← about the site, methodology, disclaimer
├── css/
│   └── style.css
├── js/
│   └── app.js             ← filtering, search, clipboard logic
├── data/
│   └── people.json        ← all person entries
└── images/
    └── portraits/         ← all AI-generated portraits
```

### Build/Process Scripts (Private — Never Pushed to GitHub)

All scripts live in `_build/` which is in `.gitignore`.
A separate private GitHub repo backs up the build scripts.

```
_build/
├── fetch_wikipedia.py     ← fetches and caches Wikipedia summaries
├── generate_stories.py    ← calls Claude API to generate adult + family stories
├── generate_prompts.py    ← builds image generation prompts per person
├── vetting.py             ← runs exclusion checklist before content generation
└── prompts/
    ├── adult_story.txt    ← master prompt template for adult stories
    └── family_story.txt   ← master prompt template for family stories
```

---

## Search and Filter

The site must be searchable and filterable by:
- **Person name** (text search)
- **Sermon / theological topic** (e.g. grace, suffering, perseverance, prayer,
  cross, resurrection, missions, martyrdom)
- **Hymn title** (where applicable)
- **Region** (UK/Ireland, North America, Africa, Asia, Latin America, Europe, Oceania)
- **Era** (Reformation, 17th Century, 18th Century, 19th Century, 20th Century,
  21st Century)
- **Review status** (reviewed / unreviewed)

All filtering happens client-side with no page reload.
Search is case-insensitive and matches partial strings.

---

## Reliable Sources

Use these sources for factual grounding. Wikipedia is primary for biography.
Others supplement for hymn and theological detail.

- **Wikipedia** — primary biographical source
  API: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`
- **Hymnary.org** — hymn metadata and biographical notes
- **CCEL (Christian Classics Ethereal Library)** — ccel.org — public domain texts
- **Dictionary of National Biography** — via Wikisource for UK figures

---

## Build Sequence (Iterative)

When building the site proceed in this order:

### Phase 1 — Foundation
1. Create the directory structure above
2. Create `people.json` with 5 seed entries (see Seed People below)
3. Build `index.html` with search/filter UI and person card grid
4. Build `person.html` template rendering from JSON
5. Build `app.js` with filtering and clipboard logic
6. Build `style.css` — clean, readable, worship-appropriate design

### Phase 2 — Build Scripts (private)
1. Write `fetch_wikipedia.py` — fetch and cache Wikipedia summaries for each person
2. Write `vetting.py` — apply exclusion checklist
3. Write `generate_stories.py` — call Claude API with sourced facts to generate
   both story versions
4. Write `generate_prompts.py` — build AI image prompts from biographical data

### Phase 3 — Content Population
1. Run build scripts for the initial 20 people list
2. Human review pass on all generated content
3. Update `human_reviewed` flags
4. Generate images using prompts

### Phase 4 — Expand
1. Add remaining people from the full list
2. Refine filtering and search
3. Add about page with methodology and disclaimer

---

## Seed People (Start With These 5)

1. **Wang Ming Dao** — Chinese pastor, suffered imprisonment for refusing to
   compromise with communist authorities
2. **John Newton** — English slave trader converted to faith, wrote Amazing Grace
3. **Fanny Crosby** — American blind hymn writer, wrote over 8,000 hymns
4. **Samuel Ajayi Crowther** — first African Anglican bishop, Nigerian, former slave
5. **John Bunyan** — English preacher and author of Pilgrim's Progress,
   imprisoned for his faith

---

## Design Principles

- Clean, readable, and dignified — appropriate for worship context
- Works well on mobile — worship leaders often use phones or tablets
- Fast loading — fully static, no external dependencies beyond standard fonts
- Accessible — good contrast, readable font sizes
- No advertising, no tracking, no cookies
- Neutral background, clear typography, portrait images prominent but not dominant

---

## Disclaimer Page

The about page must include:

- Statement of purpose — Christ-centred, grace-focused
- Explanation of the two-tier story system
- Statement that all images are AI-generated with no copyright claimed
- Explanation of the human review badge system
- Statement of exclusions and why (to avoid confusion, not condemnation)
- Invitation for corrections and suggestions
- Note that flagged figures have footnotes explaining concerns

---

## Local Development

To preview the site locally, run this from the project root:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

The site is fully static — no build step required. Changes to `data/people.json`,
HTML, CSS, or JS are visible immediately on page refresh.

---

## What Claude Code Should Do First

1. Read this entire CLAUDE.md before doing anything
2. Confirm understanding of the theological requirements
3. Create the directory structure
4. Create `people.json` with the 5 seed entries
5. Build the site phase by phase as described above
6. Ask before making any theological judgement calls not covered by these instructions
7. Never generate content for a person without first confirming they pass the
   vetting checklist
