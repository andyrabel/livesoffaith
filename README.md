# Lives of Faith

[livesoffaith.org](https://livesoffaith.org) — a static site profiling notable
Christians throughout history: hymn writers, theologians, missionaries,
martyrs, and believers from every era and region. Built for worship leaders,
Bible teachers, and families seeking Christ-centred biographical content for
services, devotions, and family worship.

Every story is grounded in Wikipedia and other verified sources, points to
Christ, and carries a clear thread of salvation by grace through faith alone.
No hero-worship, no invented facts. See [about.html](about.html) for the full
methodology and disclaimer.

## What's here

- **Person profiles** — two story versions each (an adult/worship version and
  a simpler family version), significant dates, memorials, and an
  AI-generated portrait with no copyright claimed
- **Hymn stories** — the documented history behind individual hymns, separate
  from the writer's own biography
- **Connections** — a graph of documented relationships between people
  (conversions, mentorships, collaborations, and more)
- **Timeline and map** — chronological and geographic views across every
  person and place in the dataset
- **Quiz** — trivia questions plus a printable quiz generator
- Search and filtering by name, topic, hymn, region, era, and review status

## Site architecture

Fully static, hosted on GitHub Pages — no backend, no database. All content
lives in JSON under `data/`, and all filtering/rendering happens client-side
in `js/app.js`.

```
index.html, people.html, person.html, hymns.html, hymn.html,
connections.html, timeline.html, map.html, quiz.html, about.html
css/style.css
js/app.js, js/consent.js
data/*.json
images/portraits/, images/logos/
```

## Local development

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. No build step — changes to JSON, HTML,
CSS, or JS are visible on refresh.

## Content policy

- Trinitarian, orthodox, salvation-by-grace-through-faith figures only —
  see [CLAUDE.md](CLAUDE.md) for the full exclusion list and vetting
  checklist
- Figures with a documented theological or moral/historical concern are
  marked `flagged` with a visible footnote
- All portraits are AI-generated from a public-domain or approved reference
  image — no third-party image is ever published
- Every entry carries a human-review status, shown as a ✅ badge once
  reviewed

## Contributing

This project is developed with the assistance of Claude Code, following the
detailed content rules, JSON schemas, and workflow documented in
[CLAUDE.md](CLAUDE.md). Corrections and suggestions are welcome via the
contact details on [about.html](about.html).
