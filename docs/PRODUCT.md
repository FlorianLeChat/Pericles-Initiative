# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences weigh the same:

- **The author**, a game master who writes and maintains the universe alone: pages, categories, chronology,
  live dispatches, drafts and the red links still to write.
- **The readers**, the players of the role-playing campaign, who consult the wiki between and during
  sessions to remember who someone is, where something happened, and what just changed in the world.

## Product Purpose

An encyclopedia for a fictional universe, in the shape of an alternative Wikipedia, built to document
role-playing campaigns. It succeeds the author's former Google Sites used for role-playing sessions on
Garry's Mod. Success means the author can grow the world page by page without friction, and a player can
find an answer mid-session in seconds.

## Positioning

A wiki whose link graph, in-universe chronology and live feed of in-fiction events are first-class: red
links are an invitation to write, backlinks show how the world connects, and the live feed reads as news
from inside the fiction. Entirely client side, with no account, no server and no tracking.

## Operating Context

- Preparation between sessions (writing, linking, dating events) and consultation during sessions (search,
  quick lookups, often on a phone at the table).
- Content lives in the browser's `localStorage`; it moves between browsers through a JSON export/import or an
  optional, user-provided snapshot server or S3 compatible bucket.
- A fresh browser starts from an empty wiki; a hand-written demonstration wiki can be loaded from the backups page.

## Capabilities and Constraints

- No authentication, no database, statically generated (SvelteKit `adapter-static`, SPA fallback).
- Pages carry no type: they are classified by categories with parents, and started from templates (character,
  place, organisation, event, object, concept, or a blank page) that only pre-fill dates, infobox rows and
  sections. Infobox, whose values may link to other pages, table of contents, backlinks, red links, timeline,
  dashboard, live feed with severities and tags.
- Interface in French and English; the fiction is authored content in whatever language the author writes.
- Full engineering constraints are in `CLAUDE.md`.

## Brand Commitments

- Name: Périclès Initiative. The universe name is set by the author per wiki (`wiki.meta.universe`).
- Values stated in the README: digital sobriety, accessibility, privacy (no cookies, no ads, no tracking by
  default), low bundle weight.
- Content typography: no em or en dash in the fiction, French quotation marks, typographic apostrophes.

## Evidence on Hand

- Demonstration wiki "The Lantern Coast" in `src/lib/demo.ts` (English fiction, 20 pages).
- Self-hosted fonts in `static/assets/fonts/`, the icon in `static/assets/favicon.svg`. No image ships: the ones a wiki shows are imported by the reader as base64, or linked from elsewhere.
- No real campaign content ships with the repository; nothing must be fabricated as if it were.

## Product Principles

1. The world comes first: every surface should feel like part of the universe's archive, not a content
   management tool.
2. Find it at the table: lookups must work in seconds, on a phone, mid-session.
3. Writing is play: red links, drafts and gaps are invitations, never errors.
4. Nothing is lost silently: anything that replaces or deletes the world says what it will do and offers a
   way back.
5. Light by design: no dependency weighs more than the application it serves.

## Accessibility & Inclusion

WCAG AA across both themes and both viewports; `tests/e2e/accessibility.spec.ts` runs axe over every page.
Reduced motion is honoured site wide.
