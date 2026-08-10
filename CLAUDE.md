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

SvelteKit 2 with Svelte 5 runes, TypeScript, `adapter-static`, Tailwind CSS 4, `flowbite-svelte` for
the interface components, `@lucide/svelte` for the icons, `apexcharts` for the dashboard charts,
`marked` for rendering Markdown, `@milkdown/crepe` for authoring it.

Tooling is ESLint with a flat config (`typescript-eslint` strict and stylistic, `@stylistic`,
`eslint-plugin-svelte`), Prettier with `prettier-plugin-svelte`, and commitlint on the conventional
preset. There is **no unit test runner**: the type check, the static build and the Playwright suite
are what proves a change, and the pipeline itself lives outside of this repository.

Husky enforces all of it, so a mistake here fails a commit rather than a review:

- `pre-commit` runs `lint-staged`, which is `eslint --fix` on every staged `.js`, `.ts` and `.svelte`
  file. Expect your staged files to come back reformatted.
- `commit-msg` runs commitlint, so a message off the convention is rejected outright.
- `pre-push` runs `npm run build`, so a push cannot carry a broken build.

## Language

- Code, comments, JSDoc, commit messages and this file are written in **English**.
- Everything the reader sees is written in **French**: page copy, labels, button text, error
  messages, `aria-label`, `alt` text.
- There is no internationalisation layer and none is wanted. French user facing strings are written
  inline in the component that displays them. Do not introduce a message catalogue for a single
  language.
- Identifiers that end up in data are French and lowercase: `personnage`, `evenement`, `brouillon`,
  `publie`. Keep that convention when adding one.
- Identifiers that never leave the code are English like the rest of it, even when the only thing they
  ever produce is a French sentence. `RemoteFailure` and `RemoteStatus` in `src/lib/types.ts` are the
  reference: nothing persists them, so `network` and `loading` are right and `reseau` was not.

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

- Four spaces for indentation, LF line endings, final newline, 120 column limit. `.editorconfig`
  states it, ESLint enforces the indentation and Prettier reads the column limit from there.
- **Double quotes everywhere**, in TypeScript as in markup attributes. `@stylistic/quotes` is set to
  double, so single quotes are an error, not a preference.
- Spacing rules that make this codebase look unusual are all enforced, and worth writing by hand
  rather than discovering through a failed commit: spaces inside parentheses, `( value )`, inside
  array brackets, `[ "a", "b" ]`, inside computed properties, `record[ key ]`, and inside template
  expressions, `${ value }`. Braces follow Allman style, on their own line. No trailing comma, ever.
  Semicolons always.
- Before considering work finished, run:

```bash
npm run check
```

- For anything touching rendering, routing or the dataset, also run:

```bash
npm run build
```

- For anything touching what a reader sees or does, also run:

```bash
npm run test
```

The static build is the real test of the pipeline: it exercises prerendering, which is where Markdown
rendering, the link graph and the crawler actually get proven. Playwright is the real test of the
behaviour. These three commands are the whole safety net.

`npm run check` runs twice on purpose. SvelteKit excludes `src/service-worker.ts` from the
application's `tsconfig.json`, since `lib.dom` and `lib.webworker` declare the same identifiers and
cannot share a program, so the worker is checked separately through `tsconfig.worker.json`. Without
that second pass it would be the one file nothing verifies.

- To see what the pre-commit hook will say, without committing:

```bash
npm run lint
```

- `npm run format` runs Prettier over the whole codebase. Reach for it on a file you rewrote, not on
  a two line edit: it touches everything it disagrees with and drowns the real change in the diff.

## Data rules

- The `localStorage` overlay is the **only** source of content for now. `WikiStore`
  (`src/lib/state/wiki.svelte.ts`) still merges it over a `seed`, kept for the day a real backend
  feeds one, but that seed is always empty today: nothing ships a JSON file to seed the wiki from,
  the end to end suite included, which writes the overlay itself. Application code never writes
  anywhere else. Import and export from `/data` are how content moves between browsers or gets
  backed up, until a backend replaces that.
- Everything installed into the store, seed or overlay, goes through `normalizeDataset` /
  `normalizeOverlay` in `src/lib/utilities/dataset.ts`. Both a missing seed and a missing overlay key
  must degrade into an empty, valid dataset, never throw. When you add a field to a type in
  `src/lib/types.ts`, add its normalisation in the same commit.
- Local changes live in a `localStorage` overlay, keyed by identifier, merged over the seed by
  `mergeDataset`. Upserts are keyed so re-hydrating a seed never discards work in progress.
- `id` is stable and survives a rename. `slug` is the url and may change, so never key anything
  persistent on it. Categories are the exception: they are keyed by slug.
- `localStorage` keys are namespaced `pericles:`. Currently `pericles:overlay`, `pericles:theme` and
  `pericles:remote`, the last one absent until a remote service is configured. The service worker's
  caches are namespaced `pericles-` followed by the build version, and hold the application only:
  clearing them loses nothing an author wrote.
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
- `src/service-worker.ts` precaches that build so the site survives a reload with no connection:
  every chunk, every file under `static/`, the prerendered listings, and `200.html`, which
  `prerendered` does not list and which carries every page of actual content. The lazily loaded
  Milkdown chunk is precached too, since a wiki that reads offline but cannot be written to is half a
  wiki. Cross origin requests are never intercepted, so the remote snapshot service is always
  answered by the network.
- A new build waits rather than taking over: `UpdateBanner.svelte` offers the reload, so the shell is
  never swapped under a half written article.

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

## Flowbite

Buttons, fields, radios, badges, alerts, toasts, keycaps, breadcrumbs, the tools dropdown, the mobile
drawer and the three dialogs come from `flowbite-svelte`. Reach for it before writing a control by
hand, and import by subpath, `flowbite-svelte/Button.svelte`, never from the package root: the root
is a barrel over every component in the library.

Every single choice on this site reads as a row of pills, so its radios are Flowbite's with the
appearance passed as `classes.label` and `RADIO_OVERLAY` from `src/lib/config/forms.ts` passed as
`class`. That constant, rather than the library's own `custom` variant, because `custom` hides the
input with `sr-only`, and a clipped element takes no pointer event: the pill would answer a click
only through its label, and `getByRole( "radio" ).check()` would stop reaching it.

Two controls stayed hand written on purpose. `CloseButton` was tried for the three dismissing crosses
and dropped: it carries `focus:outline-hidden`, so the focus ring has to be rebuilt, `m-0.5 p-1.5`
has to be undone, and it fires the dismiss context of whatever container it sits in, which for the
toast of `ConnectionStatus` and the drawer of `SiteHeader` is a second, invisible path to the same
state. `Tags` was tried for `ChipsInput` and dropped: it pulls `@floating-ui/dom`, its placeholder and
helper text are English, and its chips are smaller than a finger.

Four things it does not do on its own, and every one of them has bitten this codebase:

- **Its accessible names are in English.** «Close», «Breadcrumb», «Choose option ...». Anything it
  renders with a built in label needs a French one passed explicitly, and where the component gives
  no way to pass one, as with the close button of a `Modal`, use `dismissable={false}` and render
  your own control.
- **Tailwind does not see it.** `app.css` lists the folders of `dist` that are scanned. Adding a
  component means adding its folder, or it renders unstyled.
- **Half of it is a stylesheet, not a component.** A checkbox, a radio and a file input are drawn by
  the operating system, and `text-primary-600` on one of them colours nothing. `@plugin
  'flowbite/plugin'` in `app.css` is what strips them to `appearance: none` and repaints the tick, the
  dot and the file button, so the classes `Checkbox`, `Radio` and `Fileupload` carry have a surface to
  land on. Only its `forms` group is enabled; the four others are for widgets this site does not have.
- **`size="sm"` does not mean one height.** Flowbite gives an `Input` `py-1` and a `Select` `py-2.5`,
  so the two on the same row stand twelve pixels apart. `SMALL_FIELD` in `src/lib/config/forms.ts`
  brings the input up to the menu; pass it to every small input.
- **A `<dialog>` does not inherit the text colour.** The user agent gives one `color: CanvasText`,
  which resets the light cream coming down from the body to plain black, and in the dark theme that is
  black on near black. `Modal` and `Drawer` therefore spell out `text-ink-800 dark:text-paper-200`
  themselves, and anything placed inside one that relies on inheritance has to be checked in the dark
  theme, which the Playwright suite does not currently visit.
- **`primary-*` and `gray-*` are aliases of the editorial palette**, declared in `@theme`. Nothing in
  `src/` writes those two scales by hand; they exist so the classes compiled into the library resolve
  to our colours.
- **Its dialogs must not carry a Svelte transition.** `Modal` and `Drawer` are real `<dialog>`
  elements opened with `showModal`, and a transition keeps one mounted for the length of its outro. A
  dialog closed while its intro was still running never finishes leaving: it stays on screen, modal,
  with the page behind it inert. Pass `transitionParams={{ duration: 0 }}` and let the CSS in
  `app.css` do the entrance.

The dashboard charts are **not** Flowbite's, and no charting library is installed. `BarChart.svelte`
and `ActivityChart.svelte` lay their bars out with the grid and a couple of keyframes, which for two
graphs is both smaller and better behaved: they prerender, they follow the theme through the same
`dark:` variants as everything else, `prefers-reduced-motion` reaches them from `app.css`, and their
labels and figures are real text rather than an SVG that has to be described twice. ApexCharts was
tried and removed: it weighed four hundred and sixty seven kilobytes, more than the rest of the
application put together, and needed all four of those things wired by hand.

## Planning before implementation

For any change spanning several files, agree on a plan before writing code. Trivial fixes, a typo,
a single line, a copy change, go straight to the edit.

## End-to-end tests (Playwright)

Tests live in `tests/e2e/` (config: `playwright.config.ts`) and exercise the whole app end to end.
Never start a preview or dev server for them by hand: Playwright's own `webServer` builds the site
and serves it. **Whenever a change touches user facing behaviour, update the matching spec or specs
in the same commit**:

- `tests/e2e/home.spec.ts` — home page (hero figures, featured pages, live excerpt, category counts,
  empty wiki).
- `tests/e2e/wiki.spec.ts` — encyclopedia index (keyword, nature, category and status filters,
  sorting, empty states).
- `tests/e2e/article.spec.ts` — a single page (infobox, table of contents, backlinks, related reads,
  draft marker, red links).
- `tests/e2e/editor.spec.ts` — creation, edition, deletion, slug derivation and collisions, the
  Milkdown body, the link picker, the unsaved changes guard.
- `tests/e2e/categories.spec.ts` — overview, one category, and management (create, rename, delete).
- `tests/e2e/live.spec.ts` — feed (pinned group, day groups, severity and tag filters, composer,
  edition, deletion, the site wide alert banner).
- `tests/e2e/timeline.spec.ts` — chronology (grouping by year, every shape of in universe date).
- `tests/e2e/dashboard.spec.ts` — figures, breakdowns, most cited pages, red links, points of
  attention.
- `tests/e2e/data.spec.ts` — inventory of the browser, export to `wiki.json`, import, reset.
- `tests/e2e/settings.spec.ts` — identity of the wiki and the pages put forward on the home page.
  These reach `/settings` by clicking, never by `goto`: the form snapshots the identity when it
  initialises, which on a cold load happens before the overlay has been read.
- `tests/e2e/navigation.spec.ts` — header, tools menu, search palette, theme, on both viewports.
- `tests/e2e/remote-backup.spec.ts` — the optional snapshot service, entirely mocked.
- `tests/e2e/accessibility.spec.ts` — axe over every page, both viewports. It asks for reduced motion
  before measuring, since axe samples the colour an element happens to have and would otherwise read
  a listing halfway through its entrance and call every card a contrast failure.

Conventions to follow:

- Reach a starting point through the `wiki` fixture of `tests/e2e/utilities/fixtures.ts`
  (`open`, `openEmpty`, `openWith`, `navigate`, `confirm`, `storedOverlay`, `storedEntry`) rather
  than duplicating navigation or storage logic.
- **Answer a confirmation through `confirm`, and close the drawer through `navigate` or
  `waitForDrawer`.** Both wait for the dialog to have left the page, and that wait is not optional: a
  modal `<dialog>` holds the page inert until it is gone, so a click or a fill aimed at what is
  behind it lands on nothing, silently, and the spec carries on against a page that never received
  it. This is the failure that looks like a mystery, so reach for the helpers rather than for a
  locator.
- Nothing in `src/` knows the suite exists, and it must stay that way: no seed file, no test mode, no
  build flag. `open`, `openEmpty` and `openWith` write the `pericles:overlay` key before the first
  paint, in the shape `WikiStore` writes it, so a spec exercises the real loading path. Serving a
  fixture to the app instead would only reintroduce the branch in `+layout.ts` this replaced.
- Assert on the French strings the components actually render, and reach for accessible queries
  (`getByRole`, `getByLabel`, `getByText`) over CSS selectors. Never assert on a relative date: those
  move on their own.
- Never hardcode content the fixture already describes. Read it through the constants of
  `tests/e2e/utilities/dataset.ts` (`PAGES`, `CATEGORIES`, `LIVE`, `COUNTS`) so the suite follows the
  fixture rather than drifting from it.
- A change that reaches `localStorage` gets checked there too, through `storedOverlay` or
  `storedEntry`: a page that looks saved but never got persisted is the failure that matters.
- Mock every external call with `page.route()`, as `remote-backup.spec.ts` does for the snapshot
  service. No spec ever reaches a real host.
- Both projects run every spec, `chromium` on a desktop viewport and `Mobile Chrome` on a phone one.
  The header hides its navigation below the `lg` breakpoint, so branch on `isNarrow( page )` rather
  than assuming a desktop.
- `tests/e2e/utilities/host.js` serves `build/` with the `200.html` fallback, since `vite preview`
  answers 404 for every page that only exists in a browser's storage. Keep the suite on it.
- Adding a view, a mutation of the store or a shortcut without extending a spec leaves the work
  incomplete.

## Preview and dev server

**Never start a dev server on your own initiative.** The user runs it. Verification is done through
`npm run check`, `npm run build` and `npm run test`. If a running preview is genuinely needed to
prove a behaviour, ask first.

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
    app.html                    shell, pre paint theme script, manifest and theme colour
    service-worker.ts           offline shell, checked by tsconfig.worker.json
    lib/
        components/             presentation components
            dashboard/          figures and charts
            data/               file backup, remote backup, local content
            editor/             Milkdown editor, page form, link picker
            live/               live feed, composer, alert banner
        config/                 page types, palette, severities, navigation, motion, forms
        state/wiki.svelte.ts    seed plus overlay, link graph, mutations, export and import
        state/remote.svelte.ts  connection to the optional snapshot service
        types.ts                every data contract
        utilities/              markdown, dataset, remote, search, stats, date, slug, url
    routes/
        +layout.ts              installs an always empty seed, sets prerender
        +layout.svelte          installs the dataset, frames the site
        wiki/                   index and article pages
        categories/             overview, per category pages, management
        live/                   live feed
        timeline/               dated pages, by year
        dashboard/              dashboard
        new/, edit/             editor, outside prerendering
        data/                   export, import, remote backup
        settings/               identity of the wiki
static/
    assets/fonts/               self hosted Newsreader and IBM Plex, latin subset, with their OFL notice
    media/                      illustrations referenced by pages, installable icons
    manifest.webmanifest        name, icons and shortcuts of the installed site
tests/
    e2e/                        one spec per section of the site
        utilities/dataset.ts    the fixture wiki, and the constants specs assert against
        utilities/fixtures.ts   the `wiki` fixture: seeding, navigation, stored overlay
        utilities/host.js       static host for `build/`, with the SPA fallback
```
