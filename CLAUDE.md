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
Some figures are theologically orthodox but have specific areas of concern. These
fall into two categories, and either is sufficient grounds to flag:
- **Theological** — a doctrinal position not shared across evangelical traditions
  (e.g. C.S. Lewis — purgatory views; Watchman Nee — ecclesiology; Sadhu Sundar
  Singh — mystical claims)
- **Moral/historical** — a documented act or position, judged by the ethical
  standard of Scripture rather than by modern sensibility, that a reader would
  reasonably want disclosed alongside the person's story (e.g. Martin Luther —
  antisemitic writings; John Calvin — involvement in the execution of Michael
  Servetus; a slaveholder or someone who defended slavery)

**Not flaggable on its own:** ordinary intramural evangelical debates — positions
held across a wide swath of mainstream evangelicalism rather than idiosyncratic to
one figure. Dispensational premillennialism (a pretribulational/premillennial
reading of Christ's return, a distinct rapture, etc.) is explicitly **not** grounds
for a flag — it is the site owner's own position and a mainstream evangelical view,
not a fringe one. (Contrast John Nelson Darby, who is flagged not for originating
dispensationalism but for his separatist "ecclesiology of ruin" — total-separation
doctrine that caused the 1848 Brethren schism.) Cessationism/continuationism,
Calvinist/Arminian soteriology, and paedobaptist/credobaptist views fall in the
same not-flaggable category by default, absent some further idiosyncratic or
divisive element specific to the person.

Flagged figures may be included but must:
- Have `"flagged": true` in their JSON entry
- Have a `"footnote"` field with a specific, factual, charitable note — naming
  the concern plainly without excusing it or dwelling on it
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

Both versions follow a **three-paragraph structure**:
1. Who they are (background, calling, key facts)
2. What they're known for — for hymn writers, name their most famous hymns
3. A short story or moment that illustrates their faith

The Wikipedia link on each page provides further context — the story itself need not be exhaustive.

### Adult Version
- Richer theological and historical context
- May reference doctrine, historical setting, church history
- Suitable for use in adult Bible study or worship service
- **Maximum 250 words**

### Family Version
- Simpler vocabulary, narrative-focused
- Engaging for children aged 8–14
- Avoids complex theology but retains the gospel thread clearly
- **Maximum 125 words**

Both versions must:
- Be factually accurate to the sourced material
- Point to Christ and contain a salvation-by-faith thread
- Avoid invented dialogue or unverified anecdotes

---

## Image Requirements

### Publication Rule
- **All published portrait images are AI-generated — no third-party image is ever
  published on the site under any circumstances**
- Every published image has the caption text **burned directly into the image file**
  as a visible strip at the bottom, exactly:

  > AI-generated image — no copyright claimed

  This is done automatically by `_build/lineart.py` immediately after generation
  using PIL (`stamp_caption()`). The text is embedded in the JPEG itself — it is
  not only an HTML caption.

### Image Generation Process
AI portraits must be generated using a **reference image** to ensure visual and
historical accuracy. The reference image:

1. Must be either a **public domain image** (Wikimedia Commons or other verified
   public domain source) **or** an image **personally selected and approved by the
   site owner**
2. Is used solely as a visual reference for the AI generation tool — it is never
   uploaded to the site or distributed
3. Must be recorded in the JSON entry's `prompt_image_source` field for
   reproducibility and audit purposes

### Why This Matters
Using a verified reference image grounds the AI portrait in documented historical
appearance rather than plausible fiction. It also means every image can be traced
back to a specific, approved source.

### JSON Image Schema
```json
"image": {
  "file": "william-carey.jpg",
  "prompt_used": "Photorealistic portrait of William Carey, English Baptist missionary, late 18th century, wearing dark clerical coat, serious and determined expression, historically accurate to 1790s dress",
  "prompt_image_source": "https://commons.wikimedia.org/wiki/File:William_Carey.jpg — public domain, published before 1931",
  "caption": "AI-generated image — no copyright claimed",
  "redistribution_safe": true,
  "redistribution_note": "Published before 1931 — clear public-domain claim, no caveat."
}
```

- Store `prompt_used` and `prompt_image_source` in the JSON for every entry
- If no approved reference image exists yet, set `"image": null` until one is sourced
- `redistribution_safe` / `redistribution_note` — this is a **separate** question from
  "is this good enough to use as an AI-generation reference." It asks: is the actual
  source photo (not the AI portrait) confirmed safe to republish as-is somewhere off
  the site (e.g. a scheduled Facebook post)? Set `true` only when the source note is
  an unambiguous public-domain claim with no caveat, resolvable to a direct file (a
  `commons.wikimedia.org` URL). Default `false` whenever the note hedges ("reference
  only", "URAA may apply", "no known copyright restrictions", a CC-licensed personal
  permission grant, etc.) or the source isn't a Commons URL. This field is never used
  by the website itself — only by the private Facebook scheduler in `_build/fb/`,
  which must not consider a person for a real-photo post unless this is `true`.

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
  "significant_dates": [
    {
      "date": "Jul 25, 1900",
      "event": "birth",
      "details": "Born in Beijing, China."
    },
    {
      "date": "Jul 28, 1991",
      "event": "death",
      "details": "Died in Shanghai, China, aged 91."
    }
  ],
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
  "memorials": [
    {
      "type": "gravestone",
      "name": "Grave of Wang Ming Dao",
      "address": "Shanghai, China",
      "lat": 31.2304,
      "lng": 121.4737
    }
  ],
  "review": {
    "human_reviewed": false,
    "reviewed_by": "",
    "reviewed_date": ""
  }
}
```

### Significant Dates Schema

Each entry in the `significant_dates` array has:
- `date` — a string, formatted per precision available from the source:
  - Full date known: `"Jan 15, 1976"` (3-letter month, no leading zero on day)
  - Only month + year known: `"Jan 1976"`
  - Only year known: `"1976"`
  - Approximate/disputed per the source: prefix with `"c. "`, e.g. `"c. 1725"`
- `event` — one of: `"birth"`, `"death"`, `"martyred"`, `"saved"` (conversion/salvation experience), `"other"`
- `details` — short (under 20 words) factual phrase, neutral tone, no invented dialogue. Can be `""` if nothing more needs to be said.

Rules:
- Every entry gets a `birth` event and either a `death` event **or** a `martyred` event — never both. Use `martyred` only for a violent death suffered specifically for the faith (executed, burned, beheaded, hanged for resistance to persecution, etc.) — imprisonment, torture, or persecution survived to a natural death (e.g. Richard Wurmbrand, Corrie ten Boom) still gets a normal `death` event.
- Include a `saved` event only if the source gives a reasonably specific date (at least a year) for the conversion/salvation experience — omit if the source is vague ("as a young man") with no date.
- Include up to 3 `other` events, only for clearly-dated, well-documented events central to why the person matters (e.g. a famous hymn's composition date, ordination, founding of a ministry, a famous incident). Zero `other` events is fine if nothing solid exists — don't pad.
- Ground every date in Wikipedia (or another approved source) — never invent or guess a date. If uncertain, omit the event.
- Order the array chronologically.

### Memorials Schema

Each memorial in the `memorials` array has:
- `type` — one of: `"gravestone"`, `"statue"`, `"plaque"`, `"monument"`, `"window"`, `"church"`, `"museum"`, `"library"`, `"archive"`, `"other"`
- `name` — short label for the memorial
- `address` — street address or descriptive location
- `lat` — decimal latitude
- `lng` — decimal longitude
- `open_to_public` — boolean, required whenever `type` is `"museum"`, `"library"`, or `"archive"`;
  omit for gravestones/statues/plaques/monuments/windows/churches, which are assumed
  publicly viewable. `true` means a member of the public can simply walk in during
  opening hours (a museum exhibit, a public library reading room, a cathedral library
  exhibition); `false` means it's a closed-stack research collection needing an
  appointment or reader registration — the normal case for a special-collections or
  manuscripts archive, even when described as open "by appointment" or "to accredited
  researchers." When unsure, check the institution's own visiting/access page rather
  than assuming.

Use `"memorials": []` when no confirmed physical memorials are known.
When adding a new person, research and populate memorials as part of the standard workflow.
For anyone who served as a pastor, vicar, minister, or similar church leadership role,
check whether the church building they served in is still standing — if so, include it
as a memorial with `"type": "church"`.

For anyone who was an author, scholar, missionary correspondent, or otherwise likely to
have left a body of personal papers, correspondence, or manuscripts, check whether a
named library, university, or seminary holds a personal papers/manuscript archive for
them — if so, include it as a memorial. Pick the type carefully rather than defaulting
to `"museum"`:
- `"museum"` — a genuine public exhibit space with open walk-in visiting hours, even if
  it also has an attached research archive (e.g. the Marion E. Wade Center at Wheaton
  College, or the Cowper & Newton Museum, Olney — both welcome walk-in visitors free of
  charge).
- `"archive"` — a closed-stack manuscripts/special-collections department: the normal
  case for "Papers of [Name]" entries at a university, seminary, or historical society
  archive. Set `"open_to_public": false` — see the Wheaton College Archives & Special
  Collections entries for the Auca martyrs, or the Christian Brethren Archive entry for
  F. F. Bruce, both at data/people.json.
- `"library"` — a national or major public/theological library where the institution
  and its reading room are open to any visitor, even though the specific manuscript may
  need requesting in advance (e.g. the National Library of Scotland, National Library
  of Wales, Yale Divinity School Library). Set `"open_to_public": true`.

Name the entry `"Papers of [Name] — [Institution] ([Collection name if notable])"` and
cite the institution's own special-collections page or an Archives Hub / finding-aid
record, not just a passing mention — a name-check in a biography is not enough to
confirm a dedicated archive exists.

---

## Quiz Questions

`data/quiz.json` is a flat array of trivia questions that power the homepage "Quiz
Question" box and the printable quiz generator (`quiz-print.html`). Each entry:

```json
{
  "question": "What country did Hudson Taylor devote his life to reaching?",
  "answer": "China",
  "person_id": "hudson-taylor",
  "difficulty": 3
}
```

- `difficulty` — one of `1` (Easy), `3` (Medium), `5` (Hard). No other values are used.
- `person_id` must match an existing entry in `people.json`.
- `hymn_id` — optional. Include it whenever the question is about a specific hymn
  (e.g. "Who wrote the hymn X?") **and** that hymn has its own entry in
  `data/hymns.json`. It must match that entry's `id`. Omit the field entirely
  (don't set it to `null` or `""`) when the question isn't about a hymn, or the
  hymn it names has no dedicated `hymns.json` page yet. `js/app.js`
  (`renderQuizQuestion`) uses it to link the homepage quiz box's answer to the
  hymn's story page instead of the writer's person page.
- Questions should be answerable from the person's `adult_story`/`family_story`/
  significant facts — not obscure trivia beyond what the page itself documents.
- Most people have 1–3 questions; vary the difficulty rather than making them all
  Medium. Keep the phrasing style consistent with existing entries (short, factual,
  "What/Who/Where..." questions with a short answer).

When adding a new person, also add 1–3 quiz questions for them to `data/quiz.json`
as a standard part of the pipeline, after connections are added (see Step 4 below).
When adding a new hymn story
to `data/hymns.json`, also add `hymn_id` to any existing quiz question about that
hymn (see above).

---

## Connections Dataset

`data/connections.json` is a flat array of directed, labelled relationships between
people already on the site — who converted whom, who mentored whom, who married
whom, who was martyred alongside whom, and so on. It powers the person page's
**Connections** section (replacing the old date-only "Contemporaries" widget),
rendered as a chain: `Person A — label — → Person B`.

```json
{
  "from": "cesar-malan",
  "to": "charlotte-elliott",
  "label": "led to faith in Christ",
  "type": "conversion",
  "mutual": false
}
```

- `from` / `to` — must match existing `people.json` ids.
- `label` — a short phrase, worded so `"{From's name} {label} {To's name}"` reads
  naturally (e.g. "married", "mentored", "led to faith in Christ", "composed the
  tune for his hymn X"). Grounded strictly in what the two people's `adult_story`/
  `family_story` text (or the `[[Name|id]]` cross-links within it) already states —
  do not research or invent a new relationship not already documented on the site.
- `type` — one of: `"conversion"` (led someone to faith), `"mentorship"`,
  `"influence"` (inspired/shaped without a direct discipling relationship),
  `"family"` (marriage, parent/child, siblings), `"collaboration"` (co-wrote,
  co-laboured, ministry partnership), `"martyrdom"` (died together/alongside),
  `"rivalry"` (public theological or personal dispute), `"milieu"` (same
  movement/circle, no specific documented interaction beyond that).
- `mutual` — `true` when the relationship is inherently two-directional (marriage,
  co-authorship, shared martyrdom, rivalry) so only one edge is stored instead of
  both directions; `false` for one-directional relationships (A converted B, A
  mentored B) where storing the reverse would misstate who acted on whom.
- Store each unordered relationship once — don't add both `A→B` and `B→A` for the
  same fact. For a group event (e.g. several missionaries martyred together), pick
  the best-known person as the hub and add one edge per other member rather than a
  full pairwise clique.

### Updating Connections When Adding a New Person

As a standard part of Step 4 (Update Cross-References) when adding a new person:
1. After wrapping mentions of existing people in `[[Name|id]]` links (and updating
   older pages to link back to the new person), check both directions of story text
   for any documented relationship — conversion, mentorship, marriage, collaboration,
   martyrdom, rivalry, or shared movement/circle.
2. Add one edge per documented relationship to `data/connections.json` following the
   schema above. Skip incidental mentions that aren't a real relationship (e.g. one
   person merely using another's hymn generations later).
3. If the new person has a `related_people` entry, check whether the relationship
   backing it is specific enough for a typed edge (conversion/mentorship/family/
   collaboration/martyrdom/rivalry) or only a shared-movement fact (`"milieu"`).

---

## Hymn Stories

In addition to person biographies, the site publishes standalone **hymn story**
pages — the documented history behind an individual hymn (who wrote it, when,
the occasion, and the Scripture it is grounded in), distinct from the story of
the hymn's writer as a person. These live in `data/hymns.json` and render via
`hymn.html?id=...`, indexed at `hymns.html`.

A hymn only qualifies for a `hymns.json` entry if its composition is
**well-documented**: a specific, verifiable date, occasion, or Scripture basis
confirmed by Wikipedia or another approved source — not just "person X wrote
this hymn" with no further detail. Popular but apocryphal backstories (e.g.
the "sheltering in a storm-cleft rock" legend behind Toplady's "Rock of Ages")
must not be published as fact; state only what is confirmed, and note
explicitly in the story text when a well-known legend is disputed or
unconfirmed (see the "A Mighty Fortress" and "God Moves in a Mysterious Way"
entries in `data/hymns.json` for the pattern).

Before writing a hymn's story, verify who actually wrote the words versus the
music — many hymns are credited on a person's page to whoever the site's
biography is about, even when they only composed the tune (e.g. Ira Sankey)
or added a refrain to someone else's text (e.g. Robert Lowry's refrain on
Annie Hawks's "I Need Thee Every Hour"). The `hymns.json` story text itself
must credit authorship accurately regardless of which person the entry's
`person_id` points to — do not let the site's person-centred structure imply
sole authorship where none exists.

### JSON Schema — Hymn Entry

```json
{
  "id": "amazing-grace",
  "title": "Amazing Grace",
  "person_id": "john-newton",
  "year": "1772/1773",
  "scripture_basis": "1 Chronicles 17:16-17",
  "topics": ["grace", "conversion", "redemption"],
  "wikipedia_url": "https://en.wikipedia.org/wiki/Amazing_Grace",
  "adult_story": "...",
  "family_story": "...",
  "review": {
    "human_reviewed": false,
    "reviewed_by": "",
    "reviewed_date": ""
  }
}
```

- `person_id` must match an existing entry in `people.json` — this is the only
  link between a hymn and its writer; `people.json` itself is never modified
  to add a reverse reference. `js/app.js` computes the reverse lookup at
  render time (`hymnWriter()`, `hymnTitleLinkHtml()`), so a person's `hymns`
  array (plain title strings) automatically links to the matching hymn page
  when one exists, and falls back to plain text when it doesn't.
- `topics` reuses the same taxonomy as `people.json` topics, for consistent
  filtering.
- `wikipedia_url` should point to the hymn's own dedicated Wikipedia article
  when one exists and has been confirmed to load (many famous hymns have
  one); otherwise fall back to the writer's Wikipedia URL rather than guess
  at an article slug that may not exist.
- Same `adult_story` (≤250 words) / `family_story` (≤125 words) two-tier
  system and `review` block as person entries — see Two Story Versions Per
  Person and Human Review System above; the same rules apply (grounded in
  sources, Christ-centred, no invented dialogue).
- Hymns do not have portrait images, `flagged`/`footnote`, `memorials`, or
  `significant_dates` fields — those are person-specific.

### Adding a New Hymn Story

1. Confirm the hymn's composition is well-documented per the bar above —
   research its own Wikipedia article if one exists, or the relevant section
   of the writer's article.
2. Verify actual authorship (words vs. music) before writing the story; credit
   accurately even if it complicates a clean attribution to the `person_id`.
3. Write the JSON entry following the schema above, with `"review": {"human_reviewed": false, ...}`.
4. Append it to `data/hymns.json`.
5. Run `python3 _build/generate_sitemap.py` and `python3 _build/generate_llms_txt.py`
   to pick up the new hymn page.
6. Commit `data/hymns.json`, `sitemap.xml`, `llms.txt`, and `llms-full.txt`
   together.

---

## Site Architecture

The site is a **flat static site** hosted on GitHub Pages. No backend, no database,
no server-side code. All data lives in JSON files. All filtering is client-side JavaScript.

### Directory Structure

```
/                          ← site root
├── index.html             ← home page + search/filter UI
├── person.html            ← single person template page
├── hymns.html             ← hymn story index + search/filter UI
├── hymn.html              ← single hymn story template page
├── about.html             ← about the site, methodology, disclaimer
├── css/
│   └── style.css
├── js/
│   └── app.js             ← filtering, search, clipboard logic
├── data/
│   ├── people.json        ← all person entries
│   ├── hymns.json         ← all hymn story entries (see Hymn Stories above)
│   └── connections.json   ← relationships between people (see Connections Dataset above)
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
├── generate_sitemap.py    ← regenerates sitemap.xml from data/people.json and data/hymns.json (run after adding any person or hymn)
├── generate_llms_txt.py   ← regenerates llms.txt and llms-full.txt from data/people.json and data/hymns.json (run after adding any person or hymn)
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
- No advertising. Google Analytics is used for page-view tracking (sets analytics cookies); disclosed on the about page — do not describe the site as tracking-free or cookie-free
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

## How to Add a New Person (Human Workflow)

This is the process the site owner follows to add a new person to the site.
Claude Code assists at each step when asked.

**Default behaviour:** when asked to "add [Name]", Claude Code does the full
pipeline without being asked separately for each step — source and download a
reference image, generate the AI portrait (Step 6), research and populate
`memorials`, research and populate `significant_dates` (see Significant Dates
Schema above), update cross-references and the connections dataset, then add
quiz questions (Step 4, connections before quiz questions — see Quiz Questions
above) — not just write the JSON skeleton with `"image": null` and
`"memorials": []`. If no suitable public domain reference image can be found,
do not stop the pipeline — leave `"image": null` and complete every other step
(content, memorials, significant_dates, cross-references, connections, quiz
questions, sitemap) anyway. Image sourcing and portrait generation (Steps 2
and 6) can be revisited later once a reference image turns up.

### Step 1 — Decide and Vet
1. Choose a person to add
2. Ask Claude Code to run the **Exclusion Vetting Checklist** on them
3. Claude will confirm: Trinitarian faith, salvation by grace, no excluded group
   affiliation, and whether a `"flagged": true` entry is needed
4. If vetting passes, proceed. If doubtful, do not add.

### Step 2 — Source a Reference Image
1. Search Wikimedia Commons for a portrait of the person
2. Confirm the image is **public domain** (check the licence on the file page)
3. Alternatively, select and approve another image you hold rights to
4. Note the Wikimedia Commons URL or file source — this will go into `prompt_image_source`
5. If no suitable public domain image exists, the person can still be added but
   `"image": null` until one is found

### Step 3 — Generate Content
Ask Claude Code:
> "Add [Name] to people.json. Wikipedia URL: [url]. Reference image: [url]."

Claude will:
- Fetch biographical facts from Wikipedia
- Run the vetting checklist
- Write the adult story (≤250 words) and family story (≤125 words)
- Write the image generation prompt
- Research and populate `significant_dates` (birth, death or martyred, saved
  if dated, up to 3 other well-documented dated events — see Significant
  Dates Schema above)
- Add the full JSON entry with `"image": null` and all fields populated
- Flag the entry if needed and explain why
- **Update `sitemap.xml`** to include the new person's URL (run `python3 _build/generate_sitemap.py`)
- **Update `llms.txt` and `llms-full.txt`** so AI assistants have the new person's
  content (run `python3 _build/generate_llms_txt.py`)

### Step 4 — Update Cross-References
Stories link to each other with the `[[Display Name|person-id]]` syntax (rendered
by `storyToHtml()` in `js/app.js`), so a new person's arrival can affect existing
pages as well as their own:
1. Search the new person's `adult_story` and `family_story` for names of other
   people who already exist in `people.json` (e.g. a mentor, convert, or
   collaborator) and wrap those mentions in `[[Name|id]]` links
2. Search existing people's `adult_story` and `family_story` text for plain-text
   mentions of the new person's name and convert them to `[[Name|new-person-id]]`
   links so older pages now point to the new one
3. Only link a name the first time it's mentioned in a given story paragraph —
   don't over-link
4. Confirm existing `topics` shared with the new person still make sense (no
   JSON change needed here, just a sanity check)
5. **Add connections** — see Connections Dataset above: add one typed, labelled
   edge to `data/connections.json` for every documented relationship the new
   person's story text (or an existing person's story text) reveals with someone
   already on the site
6. **Add 1–3 quiz questions** for the person to `data/quiz.json` (see Quiz
   Questions schema above) — do this after connections, since a connection
   can suggest a good quiz question (e.g. "Who led [X] to faith?")

### Step 5 — Review Content
1. Read both stories carefully
2. Check theological accuracy: does it point to Christ? Is the gospel thread clear?
3. Check factual accuracy against the Wikipedia source
4. If the entry is flagged, verify the footnote is accurate and charitable
5. Optionally run a **Copyscape check** on the story text before publishing:
   - Go to [copyscape.com](https://www.copyscape.com) → use the Premium Batch or
     paste-text check
   - Look for any phrases that have been reproduced verbatim from Wikipedia or
     other sources — AI occasionally mirrors source text without paraphrasing
   - Rewrite any flagged passages, then re-check
6. Request any changes from Claude Code before proceeding

### Step 6 — Generate the AI Portrait
1. Place the approved reference image in `_build/sources/[person-id].jpg`
2. Run the generation script:
   ```bash
   python3 _build/lineart.py --id [person-id]
   ```
   The script calls Replicate (ControlNet SDXL), saves the result to
   `images/portraits/[person-id].jpg`, then **automatically burns the caption
   "AI-generated image — no copyright claimed" into the bottom of the image file**
   via `stamp_caption()`. The caption strip is part of the image itself — it
   travels with the file if copied or downloaded.
3. Review the result in a browser — regenerate with `--force` if historically inaccurate
4. If this step is being run in a later session to backfill a portrait for a
   person originally added with `"image": null` (Steps 1–5, 7–10 already
   committed and pushed), remember that `images/portraits/[person-id].jpg` is
   a new untracked file — it must be `git add`ed alongside the updated
   `data/people.json` when you commit this portrait, the same as Step 10 does
   for a brand-new person

### Step 7 — Update the JSON
Ask Claude Code to update the entry:
> "Update [person-id] image: file=[person-id].jpg, prompt_image_source=[url]"

Or edit `data/people.json` directly:
```json
"image": {
  "file": "person-id.jpg",
  "prompt_used": "...",
  "prompt_image_source": "https://commons.wikimedia.org/...",
  "caption": "AI-generated image — no copyright claimed"
}
```

### Step 8 — Mark as Reviewed
Once you are satisfied with the content and image, set:
```json
"review": {
  "human_reviewed": true,
  "reviewed_by": "Andrew",
  "reviewed_date": "YYYY-MM-DD"
}
```
The ✅ badge will then appear on the published page.

### Step 9 — Update Sitemap and llms.txt
Run the sitemap and llms.txt generators to add the new person and update dates:
```bash
python3 _build/generate_sitemap.py
python3 _build/generate_llms_txt.py
```
This regenerates `sitemap.xml`, `llms.txt`, and `llms-full.txt` from
`data/people.json` automatically.

### Step 10 — Commit and Push
```bash
git add data/people.json data/quiz.json data/connections.json sitemap.xml llms.txt llms-full.txt images/portraits/[person-id].jpg
git commit -m "Add [Name]"
git push
```

---

## Periodic Site Maintenance

Run these checks occasionally — roughly every time a new batch of people is added,
or before any public promotion of the site.

### Copyscape Content Check
AI-generated text can occasionally reproduce Wikipedia or other source text verbatim
without paraphrasing properly. Check story text for plagiarism periodically:

1. Go to [copyscape.com](https://www.copyscape.com)
2. Use **Copyscape Premium** (batch mode or paste-text check) to check each
   person's adult and family story
3. If any passages match external sources too closely:
   - Ask Claude Code to rewrite the flagged passage with different phrasing
   - Re-check until clean
4. For bulk checking once the site is live: use the **Copyscape API** or the
   **CASSIA** batch checker to submit all page URLs at once

Note: images are AI-generated and carry no copyright, so image plagiarism is not
a concern. The Copyscape check covers text only.

### Image Audit
Periodically confirm that no non-AI images have crept into `images/portraits/`:
```bash
# All portraits should be listed in people.json with image.file set
python3 -c "
import json; data=json.load(open('data/people.json'))
files = {p['image']['file'] for p in data if p.get('image')}
print('Expected:', sorted(files))
"
ls images/portraits/
```

Any `.jpg` file in `images/portraits/` that is not listed in `people.json` should
be investigated and removed.

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
