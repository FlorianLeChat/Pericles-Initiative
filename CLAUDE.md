# Project instructions — Périclès Initiative

An encyclopedia for a fictional universe, in the shape of an alternative Wikipedia: pages for
characters, places, events, organisations, objects and concepts, a category system, links between
pages with backlinks and red links, a dashboard, and a fictional live feed whose items can point at a
detailed page.

Three constraints shape every decision in this repository:

- **No authentication.** There is no notion of user, role or session. Anyone reaching the site can
  read and edit.
- **No database, for now.** All content lives in the browser's `localStorage`, in the `pericles:overlay`
  key. There is no seed file: a fresh browser starts from an empty wiki. This is expected to change,
  once a real backend exists to feed the seed instead.
- **Statically generated.** The build produces plain HTML files plus a SPA fallback. There is no
  server at runtime, so the site can never write its own data. Editing happens in the browser and is
  exported as JSON that a human commits.

When a proposed feature conflicts with one of these three, say so instead of quietly introducing a
backend, a build step that writes into `static/`, or an authentication shim.

## Stack

SvelteKit 2 with Svelte 5 runes, TypeScript, `adapter-static`, Tailwind CSS 4, `marked` for
rendering Markdown, `@milkdown/crepe` for authoring it. No linter and no test runner: CI is handled
outside of this repository.

## Language

- Code, comments, JSDoc, commit messages and this file are written in **English**.
- Everything the reader sees is written in **French**: page copy, labels, button text, error
  messages, `aria-label`, `alt` text.
- There is no internationalisation layer and none is wanted. French user facing strings are written
  inline in the component that displays them. Do not introduce a message catalogue for a single
  language.
- Identifiers that end up in data are French and lowercase: `personnage`, `evenement`, `brouillon`,
  `publie`, `fusionner`, `remplacer`. Keep that convention when adding one.

## Content typography

These rules apply to the fiction itself, which means everything written into the wiki through the
editor, and any sample text written into components.

- **Never use an em dash or an en dash** in narrative text, summaries, infobox values or live feed
  items. Use a comma, a colon, or split the sentence.
- Use French quotation marks with their spaces, « comme ceci », not straight double quotes.
- Prefer the typographic apostrophe in prose. `slugify` strips it, so it never leaks into a slug.
- Write numbers out when the fiction reads better that way: `soixante douze heures`, not `72 h`, in
  narrative prose. Infobox values may stay numeric.

## Comments and JSDoc

- Every exported function, class member and Svelte component gets a JSDoc block, with `@param`,
  `@returns` and `@throws` where they apply.
- Any JSDoc block you author ends with `@author Claude`.
- Non exported helpers get a JSDoc block when their intent is not obvious from the name.
- Inline comments explain **why**, never **what**. A comment restating the code is noise, a comment
  recording a constraint is documentation. Good example, from `src/routes/+layout.svelte`: effects do
  not run while prerendering, which is why the dataset is also installed synchronously.

## Prefer arrow functions

Use `const name = (args): Return => ...` for every standalone function. Class methods keep the
regular method syntax. Do not use `function` declarations.

## Clarity over shortcuts

Extract intermediate values into named constants rather than nesting expressions, even short ones.
A named boolean beats a clever condition. Regular expressions live in a named module level constant
with a comment, never inline inside a call.

## Code style

- Four spaces for indentation, LF line endings, final newline, 120 column soft limit. This is
  enforced by `.editorconfig` and nothing else, so respect it by hand.
- Single quotes in TypeScript, double quotes in markup attributes.
- No linter and no formatter is configured. Match the surrounding file.
- Before considering work finished, run:

```bash
npm run check
```

- For anything touching rendering, routing or the dataset, also run:

```bash
npm run build
```

The static build is the real test: it exercises prerendering, which is where Markdown rendering,
the link graph and the crawler actually get proven.

## Data rules

- The `localStorage` overlay is the **only** source of content for now. `WikiStore`
  (`src/lib/state/wiki.svelte.ts`) still merges it over a `seed`, kept for the day a real backend
  feeds one, but that seed is always empty today: nothing ships a JSON file to seed the wiki from.
  Application code never writes anywhere else. Import and export from `/data` are how content moves
  between browsers or gets backed up, until a backend replaces that.
- Everything installed into the store, seed or overlay, goes through `normalizeDataset` /
  `normalizeOverlay` in `src/lib/utilities/dataset.ts`. Both a missing seed and a missing overlay key
  must degrade into an empty, valid dataset, never throw. When you add a field to a type in
  `src/lib/types.ts`, add its normalisation in the same commit.
- Local changes live in a `localStorage` overlay, keyed by identifier, merged over the seed by
  `mergeDataset`. Upserts are keyed so re-hydrating a seed never discards work in progress.
- `id` is stable and survives a rename. `slug` is the url and may change, so never key anything
  persistent on it. Categories are the exception: they are keyed by slug.
- `localStorage` keys are namespaced `pericles:`. Currently `pericles:overlay` and `pericles:theme`.
- Images are a path under `/media/` or an absolute URL. Never store base64 in the dataset: the
  overlay shares the roughly five megabyte `localStorage` quota with all the text. Static images
  under `static/media/` are the one thing that still ships with the repository.
- Dates: `createdAt`, `updatedAt` and `publishedAt` are real ISO timestamps. `timelineDate` is an in
  universe date and may be free text, which is why every date helper falls back to returning its
  input untouched.
- Every listing (`/wiki`, `/categories`, `/timeline`, the home page) must handle having zero entries
  gracefully: a fresh browser starts from an empty wiki, so this is the default state, not an edge
  case. Show an inviting message with a link to create content, never a silent empty grid.

## Article Markdown

- Page bodies are Markdown, stored in `Entry.body`. Milkdown authors that Markdown, `marked` renders
  it. Milkdown is never used to display an article.
- Internal links use plain Markdown pointing at an internal path: `[Athéna Vance](/wiki/athena-vance)`.
  There is deliberately **no** `[[wiki]]` syntax: standard links round trip through the editor
  untouched and still give us the link graph, the backlinks and the red links.
- A link to a slug with no page becomes a red link, and its target renders a page inviting creation.
  This is a feature, not a broken state, and it must never throw or 404.
- Bodies start their headings at level 2. Level 1 is the page title, rendered outside the body.
- Do not author raw HTML in a body. `sanitizeHtml` strips scripts, dangerous tags, event handlers
  and executable urls, but it is regex based defence in depth for a single author site, not a
  hardened sanitizer. Do not extend its responsibilities, and do not present it as a security
  boundary.
- Components never call `marked` directly. Rendering goes through `renderArticle` or `renderInline`
  in `src/lib/utilities/markdown.ts`, so headings, anchors and link decoration stay consistent
  everywhere.

## Svelte 5 conventions

- Runes only: `$state`, `$derived`, `$derived.by`, `$effect`, `$props`, `$bindable`. No `export let`,
  no `$:`, no `writable` store, no `$store` autosubscription.
- Read the page with `import { page } from '$app/state'`, not `$app/stores`.
- Shared state lives in `src/lib/state/*.svelte.ts` as a class holding `$state` fields, exported as a
  singleton. `src/lib/state/wiki.svelte.ts` is the model to follow.
- An effect that only writes derived looking values is a smell. Reach for `$derived` first.
- Browser only code is guarded with `browser` from `$app/environment`. Never touch `localStorage`,
  `document` or `window` during rendering, only from `$effect` or `onMount`.

## Static build constraints

- Every page is prerendered by crawling links from `/`. A page that no rendered `<a href>` points at
  will not exist as static HTML. This is why `/wiki` lists every page, drafts included: it is the
  crawler's entry point into the corpus. With an empty seed, that listing is empty at build time, so
  `/wiki/[slug]` and `/categories/[slug]` are never prerendered: every page of actual content is
  served through the SPA fallback instead. This is expected, not a regression to fix.
- Editor routes cannot be prerendered. They export `prerender = false` and `ssr = false`, and the
  SPA fallback `200.html` serves them, along with every page that only exists in the local overlay,
  which today means essentially all content.
- Server rendered output must never contain overlay data. The overlay is loaded in an effect, after
  hydration, so that the static HTML matches the (empty) seed exactly.

## Semantic HTML

Use the element that carries the meaning: `<main>`, `<article>`, `<aside>`, `<nav>` with an
`aria-label`, `<header>`, `<footer>`, `<section>`, `<figure>` with `<figcaption>`, `<dl>` for label
and value pairs, `<button>` for actions and `<a>` for navigation. A `<div>` is for layout only.
Every interactive control without visible text needs an `aria-label`.

## Component decomposition

Components live in `src/lib/components/`, one responsibility each, PascalCase filename. Split a file
when a section gains its own logic or when it grows past roughly two hundred lines. Presentation
details that appear in more than one component, such as the colour of a category or the icon of a
page type, belong in `src/lib/config/`, not duplicated in markup.

## Planning before implementation

For any change spanning several files, agree on a plan before writing code. Trivial fixes, a typo,
a single line, a copy change, go straight to the edit.

## Preview and dev server

**Never start a dev server on your own initiative.** The user runs it. Verification is done through
`npm run check` and `npm run build`. If a running preview is genuinely needed to prove a behaviour,
ask first.

## Commits

Conventional Commits, lowercase description:

```
feat(wiki): add backlinks panel to article pages
fix(markdown): keep heading anchors stable across emphasis
docs(readme): update architecture diagram
```

End every commit message with the model attribution line:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Do not commit or push unless asked.

## Architecture diagram

`README.md` holds a Mermaid diagram of the data flow, from the `localStorage` overlay to the rendered
pages and back out through the export. Update it in the same commit as any change to that flow.

## Structure

```
src/
    app.css                     theme, dark mode variant, shared component classes
    app.html                    shell, pre paint theme script
    lib/
        components/             presentation components
            dashboard/          figures and charts
            editor/             Milkdown editor, page form, link picker
            live/               live feed, composer, alert banner
        config/                 page types, palette, severities, navigation
        state/wiki.svelte.ts    seed plus overlay, link graph, mutations, export and import
        types.ts                every data contract
        utils/                  markdown, dataset, search, stats, date, slug
    routes/
        +layout.ts              installs an always empty seed, sets prerender
        +layout.svelte          installs the dataset, frames the site
        wiki/                   index and article pages
        categories/             overview, per category pages, management
        direct/                 live feed
        timeline/               dated pages, by year
        dashboard/              dashboard
        new/, edit/             editor, outside prerendering
        data/                   export and import
        settings/               identity of the wiki
static/
    media/                      illustrations referenced by pages
```
