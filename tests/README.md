# Site audit

A regression check for authorjamesmulhern.com. It exists because of specific
things that actually broke on this site, not as generic linting.

## What it catches

| Check | What it looks for | Why |
| --- | --- | --- |
| `horizontal-overflow` | Any page scrolling sideways at any width | The whole site had a scrollbar at 1366px and 1440px for a while, and nobody noticed |
| `plaque-overflow` | `.deco-plaque` breaking past the viewport | The press kit ran 127px off-screen on a tablet — the page reviewers open |
| `button-overflow` | `.btn` corner brackets landing past the viewport | The brackets are drawn *outside* the button, so a long label pushed the page sideways |
| `price-wrap` | `.rate-amount` wrapping or clipping | A wrapped `$1,450` reads as two numbers |
| `wordmark-wrap` | "JAMES MULHERN" on two lines above 1360px | It quietly broke in two when the menu grew |
| `heading-hierarchy` | Missing/duplicate `<h1>`, empty headings, skipped levels | Structure and accessibility |
| `link-validity` | Dead internal links, missing assets, dead `#anchors` | Nothing worse than a dead link on a press kit |
| `image-alt` | Images with no `alt` | Accessibility |
| `page-meta` | Missing `<title>` or thin meta description | Search results |

The button check reads the negative `right` offset off the `::before` /
`::after` pseudo-elements and adds it to the button's box before comparing to
the viewport. A plain bounding-box check misses that class of bug entirely —
which is exactly why it shipped in the first place.

## Setup (once)

```bash
cd tests
npm install
npx playwright install chromium
```

## Running it

```bash
# from the repo root
node tests/site-audit.mjs                 # all pages, 9 widths  (~30s)
node tests/site-audit.mjs --full          # all pages, 20 widths (~2min)

# just the two pages that matter most, at every width
node tests/site-audit.mjs --pages press-kit.html,services.html --full

# also check outbound links (slow, and some hosts block robots)
node tests/site-audit.mjs --external

# machine-readable output
node tests/site-audit.mjs --json report.json
```

Or via npm from the `tests/` folder: `npm run audit`, `npm run audit:full`,
`npm run audit:key`, `npm run audit:links`.

It serves the site itself on a random port, so nothing needs starting first.

## Reading the result

- **Exit 0** — clean, or warnings only. Safe to deploy.
- **Exit 1** — at least one failure. Something is broken.
- **Exit 2** — the audit itself could not run (Playwright missing, bad `--pages`).

Failures name the page, the width, and the element:

```
FAIL plaque-overflow (6)
     press-kit.html @560px  plaque breaks past right edge by 266px ("For Journalists, Reviewers & Booksellers")
```

Warnings do not fail the build. Skipped heading levels are warnings on purpose:
the Deco plaques carry the visual section label, so the outline legitimately
jumps from `h1` to `h3` on several pages. If you ever convert those plaques to
real headings, the warnings will clear on their own.

## In CI

`.github/workflows/site-audit.yml` runs on every push and pull request to
`main`, before Cloudflare publishes. The report is attached to the run as an
artifact and the tail of the output appears in the run summary.

You can also trigger it by hand from the Actions tab, with optional toggles for
the full width sweep and outbound link checking.

## Adding a check

Guards live in `inPageAudit()` in `site-audit.mjs` and run in the browser at
every width. Push findings onto one of the arrays on `out`, then surface them
in the reporting block in `main()`.

Before trusting a new check, break the thing on purpose and confirm it fails.
Two of the checks in here were wrong on the first pass — one flagged the
plaques' deliberate bleed past their text column as a bug, and one used
`[^"']*` to read meta descriptions, which stopped dead at the apostrophe in
"A writer's credo" and reported a 200-character description as 8 characters
long. Both looked like site problems and were tooling problems.
