# Foundation refactor + Delegation Briefing Builder — Design

Date: 2026-10-10
Status: Draft, awaiting review

## Purpose

Turn the static course notes into a site with small interactive tools, starting with the lowest-risk, highest-visibility one. This cycle delivers (1) a modular foundation that later features reuse and (2) the **delegation briefing builder**, a form that produces a ready-to-send briefing following the course's 8-step delegation process.

Audience and goal were not chosen by the owner; the defaults below follow the earlier recommendation (reusable foundation, then the cheapest visible feature). Team grid and scenario trainer are explicitly **out of scope** for this cycle.

## Constraints

- Static files served by GitHub Pages; no backend, no build step, no new runtime dependencies.
- Two editions must stay in parity: `index.html` (English, LTR) and `ar.html` (Arabic, RTL).
- Existing readers must not lose saved progress.
- Nothing is pushed or deployed without the owner's explicit request.

## Current state

- `script.js` (339 lines) is one `DOMContentLoaded` closure: theme, font size, TOC drawer, scroll-spy, progress, lightbox, heading-link buttons, reading meta, read marks, resume toast, localized strings keyed on `document.documentElement.lang`.
- `styles.css` (866 lines) uses design tokens, `html.dark-mode`, and an `html[dir="rtl"]` block.
- Existing localStorage keys: theme, font size, `read-en`, `read-ar`, `pos-en`, `pos-ar`.

## Architecture

`script.js` is replaced by a small entry point loaded as `<script type="module">` that imports modules from a new `js/` folder:

| Module | Responsibility |
|---|---|
| `store.js` | Namespaced JSON storage (`htl:v1`), safe read/write, migration of legacy keys, export/import |
| `i18n.js` | One string table for `en`/`ar`, chosen from `document.documentElement.lang` |
| `theme.js`, `font.js` | Theme toggle and A+/A− (moved as-is) |
| `nav.js` | TOC build, drawer, scroll-spy, progress, prev/next |
| `reader.js` | Reading meta, heading links, read marks, resume toast |
| `lightbox.js` | Image dialog |
| `delegation-builder.js` | New feature (below) |

Rules: each module exports one `init()` and owns its DOM; modules communicate through `store.js` and `i18n.js` only. Behavior of moved code must not change.

Both HTML files change only in the script tag (`<script type="module" src="js/main.js">`) and in the markup hook for the builder.

### store.js

- Single key `htl:v1` holding `{ v: 1, theme, fontSize, read: {en:[], ar:[]}, pos: {en, ar} }`.
- Every `localStorage` access is wrapped in try/catch; on failure the module falls back to an in-memory object and the site works without persistence.
- On first run, legacy keys are read, merged into the new object, written once, then left in place (not deleted) so a rollback loses nothing.
- `exportJSON()` / `importJSON(file)` use a Blob download and a file input; import validates `v === 1` and ignores unknown keys.

### i18n.js

- `t(key, vars?)` returns the string for the current language; missing keys fall back to English and log a console warning in development.
- Existing inline strings (reading time, resume toast, etc.) move into the table with identical text.

## Delegation briefing builder

**Placement:** a card at the end of the section `how-to-delegate-the-8-step-process` on both pages, inserted by `delegation-builder.js` after that section's last element, so no manual duplication of markup per language.

**Fields:** task, person, why them (free text), deadline, budget/limits, reporting rhythm (select: daily / weekly / at milestones / only if a problem), support offered (select: check in anytime / scheduled help / on request).

**Output:** a briefing assembled from templates in the order of the course's steps: what is needed; why it matters; why you were chosen; limits (time, money); how you'll report; support available; check of understanding ("What will your first step be?"); closing confidence line. Empty fields drop their line instead of leaving placeholders.

**Behavior:**
- Preview updates on every input (`aria-live="polite"` region).
- **Copy** writes the preview text to the clipboard; if the Clipboard API is unavailable or denied, the preview is selected so the user can copy manually, and a message says so.
- **Clear** empties the form.
- Form values are held in memory only and never stored.
- Arabic templates use gender-neutral phrasing (no gendered verbs addressed to the person).

**Accessibility:** every control has a visible label; focus ring uses the existing token; fully keyboard-operable; layout mirrors in RTL; respects `prefers-reduced-motion`.

## Error handling

| Failure | Result |
|---|---|
| localStorage blocked/throws | Site works; progress not persisted |
| Corrupt `htl:v1` JSON | Ignored, rebuilt from legacy keys or defaults |
| Import of invalid file | Rejected with a visible message; nothing overwritten |
| Clipboard denied | Manual-copy fallback |
| Module fails to load | Page content remains fully readable (it is static HTML) |

## Testing / verification

There is no automated test setup in this repo and none is added this cycle. Manual checklist, run after each module move and after the builder:

1. `index.html` and `ar.html` at 375px and desktop, light and dark: no console errors, no horizontal scroll.
2. Theme, font size, TOC drawer, scroll-spy, progress bar, prev/next, lightbox, heading links, reading meta, read marks, resume toast behave as before.
3. A browser profile that already has legacy keys keeps its read marks and resume position after the change.
4. Storage blocked: pages still render and operate.
5. Builder: fields → preview, drop-empty-lines, Copy (and fallback), Clear, keyboard-only use, RTL layout, Arabic text reads naturally.

Known gap: no real-device (phone) testing and no Lighthouse run so far; the report will say so.

## Delivery

1. Commit 1: modular refactor, behavior unchanged.
2. Commit 2: delegation builder (+ CSS in `styles.css`).
3. Commits are local; push/deploy only on the owner's request.

## Out of scope

Team grid, scenario trainer, flashcards, search, PWA, read-aloud, highlights, quiz, radar audit, illustrated story, any build tooling or test framework.

## Open assumptions

- ES modules are acceptable (site is always served over HTTP via Pages or a local server, not opened from disk).
- Default priority order (foundation → builder) stands unless the owner picks goal A/B/C differently.
