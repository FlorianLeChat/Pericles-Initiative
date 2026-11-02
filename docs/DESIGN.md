---
name: Périclès Initiative
description: An encyclopedia for a fictional universe, Wikipedia redesigned today with the library catalogue card surviving in three details.
colors:
  ground: "#ffffff"
  paper-50: "#f7f8f9"
  paper-100: "#f1f2f4"
  paper-200: "#e3e5e8"
  paper-300: "#cfd3d8"
  paper-400: "#9aa1aa"
  ink-400: "#5b6168"
  ink-500: "#4a5057"
  ink-600: "#3a3f45"
  ink-700: "#2c3035"
  ink-800: "#202326"
  ink-900: "#17191c"
  ink-950: "#101214"
  dark-ink-700: "#2a2e34"
  dark-ink-800: "#1f2328"
  dark-ink-900: "#1b1e22"
  dark-ink-950: "#141619"
  dark-paper-200: "#e4e6ea"
  dark-paper-400: "#a2a8b1"
  accent-200: "#b8d8ff"
  accent-400: "#5a9bf0"
  accent-500: "#2f7ae0"
  accent-600: "#1f5fbd"
  accent-700: "#1c56ad"
  accent-800: "#193f7a"
  alert-500: "#c42b22"
  alert-600: "#a8231c"
  dark-alert-500: "#f07a6e"
  signal-500: "#d97706"
  signal-700: "#a14a06"
  dark-signal-700: "#f0b45e"
typography:
  display:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  wordmark:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Public Sans, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  article-heading:
    fontFamily: "Public Sans, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  lede:
    fontFamily: "Public Sans, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.625
  body-article:
    fontFamily: "Public Sans, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.78
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Public Sans, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Public Sans, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  call-number:
    fontFamily: "IBM Plex Mono, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.025em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  header-height: "64px"
  measure: "70ch"
  infobox-width: "320px"
  toc-rail: "208px"
  container-wide: "1280px"
  container-listing: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.accent-700}"
    textColor: "{colors.ground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-800}"
  button-alternative:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-800}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  search-pill:
    backgroundColor: "{colors.paper-100}"
    textColor: "{colors.ink-400}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  search-pill-hover:
    backgroundColor: "{colors.paper-200}"
  filter-pill-offered:
    backgroundColor: "{colors.paper-200}"
    textColor: "{colors.ink-600}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "36px"
  filter-pill-chosen:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.paper-100}"
  surface:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.xl}"
  floating-panel:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.2xl}"
    padding: "12px"
  call-number:
    textColor: "{colors.ink-400}"
    typography: "{typography.call-number}"
  wiki-link:
    textColor: "{colors.accent-600}"
  wiki-link-missing:
    textColor: "{colors.alert-500}"
  title-rule:
    backgroundColor: "{colors.alert-500}"
    width: "32px"
    height: "2px"
  severity-breaking:
    backgroundColor: "{colors.alert-600}"
    textColor: "{colors.ground}"
    rounded: "{rounded.full}"
---

# Design System: Périclès Initiative

## Overview

**Creative North Star: "Wikipédia modernisé"**

Wikipedia as it would be redesigned today, calm and airy, with the library catalogue card surviving in three exact details: the call number in mono, the short red rule under a title, and the dotted red link that invites writing. The ground is white, the greys are cool, and structure is drawn by hairlines rather than shadows. The site reads first and operates second: the editor, the dashboard and the data tools inherit the same frame instead of switching to an admin skin.

Density is a reference work's: real reading measure for bodies (70ch), listings as hairline divided rows rather than card grids, a quiet header with one coloured action. The serif appears for titles and nothing else, so its arrival marks "this is the thing you are reading". Colour is rare and meaningful: one accent the author chooses, fixed hues for categories and severities, red for the catalogue details and for danger.

This world replaced an earlier warm cream paper editorial skin. That look is rejected, as is the card grid content site template.

**Key Characteristics:**
- White ground, cool neutral `paper-*` / `ink-*` scales, retouched for the dark theme.
- Public Sans for everything, Source Serif 4 for titles and the wordmark, IBM Plex Mono for call numbers and machine strings.
- One reader chosen accent, spent on links and the primary action.
- Hairlines over shadows; flat surfaces lifted by a 1px border.
- Listings as divided rows with a call number column, never card grids.
- Catalogue card details: call number, 32px red title rule, dotted red link.

## Colors

A neutral, cool grey archive with one chosen accent and a catalogue red.

### Primary
- **Chosen Accent** (accent ramp; default «bleu», `accent-600` for links, `accent-700` for the primary button surface): the one colour the author picks in settings, from six named ramps (bleu, vert, ambre, violet, rose, cyan) declared as `[data-accent]` blocks in `src/app.css`. Stops keep their roles across every ramp: 500 is the focus ring, 600 draws a link on white, 700 carries white text, 800 is the hover of a primary button, 200 is the text selection. In dark mode links use 400.

### Secondary
- **Catalogue Red** (`alert-500`, dark `dark-alert-500`): the title rule, red links to missing pages, destructive emphasis. Tuned to clear 4.5:1 at 12px on white, which is why it is not the stock red. `alert-600` paints the breaking severity badge and banner.

### Tertiary
- **Signal Amber** (`signal-500` for dots and tints, `signal-700` for text, dark `dark-signal-700`): drafts and warnings. 500 never carries text.

### Neutral
- **Ground** (white): page and card surfaces in light mode; cards are distinguished from the page by their hairline alone.
- **Paper scale** (`paper-50` to `paper-400`): `paper-100` fills the search pill and quiet hovers, `paper-200` is the hairline of every surface and divider and the offered filter pill, `paper-300` the hovered hairline and dashed empty states, `paper-400` list bullets and dark mode muted text.
- **Ink scale** (`ink-400` to `ink-950`): `ink-400` muted text (holds 4.5:1 on every light paper stop), `ink-600` secondary text, `ink-700` article body, `ink-800` default text, `ink-900` headings. In dark mode `ink-950` is the ground, `ink-900` the card, `ink-700`/`ink-800` the hairlines, and the stops shift to the `dark-ink-*` / `dark-paper-*` values ("encre réchauffée") through a scoped `.dark` override, so a component writes the same class in both themes.

### Fixed hues (categories and severities)
Category colours (`src/lib/config/palette.ts`) and live severities (`src/lib/config/severities.ts`) use fixed Tailwind stock hues: a 100 tint with 700/800 text for a chip, a 500/600 dot, and a `900/60` tint with 200 text in dark mode. Seven category keys (bleu, vert, ambre, violet, rose, cyan, pierre); four severities (info in neutrals, important in blue, urgent in amber, breaking in `alert-600` with white text).

### Named Rules
**The Spent Accent Rule.** The accent draws links, the primary action, the focus ring, the caret and the selection, and nothing else. No accent headings, borders, backgrounds or icons for decoration.

**The Fixed Hue Rule.** Category and severity colours never read from `accent-*`. With an amber accent, a blue category drawn in the accent became amber and two categories became one; their hues are fixed so they mean the same thing on every wiki.

**The Alias Rule.** `primary-*` and `gray-*` exist only as aliases so Flowbite's compiled classes resolve to the accent and the paper/ink scales. Nothing in `src/` writes them by hand.

## Typography

**Display Font:** Source Serif 4 (with Iowan Old Style, Palatino Linotype, Georgia)
**Body Font:** Public Sans (with Segoe UI, Roboto, Helvetica Neue, Arial)
**Label/Mono Font:** IBM Plex Mono (with SFMono-Regular, Menlo, Consolas)

**Character:** A plain, civic sans does all the work, including section headings; a single serif with optical sizing names the thing being read. All three faces are self hosted, latin subset, so no page reaches a font host. Body text sets tabular figures site wide.

### Hierarchy
- **Display** (Source Serif 4, 600, 2.25rem, line height 1.1, tracking tight): the title of an article, of a red link page and of the home page.
- **Headline** (Source Serif 4, 600, 1.875rem rising to 2.25rem from `sm`): the title of a section page, through `PageHeader`.
- **Wordmark** (Source Serif 4, 600, 1.125rem): the universe name in the header; the same serif size titles the infobox and dialogs.
- **Article heading** (Public Sans, 600, 1.5rem, tight): level 2 headings inside a body.
- **Title** (Public Sans, 600, 1.25rem, tight): `.section-heading`, every section inside a page.
- **Lede** (Public Sans, 400, 1.125rem to 1.25rem, relaxed, max 62ch): the summary under an article title.
- **Body** (Public Sans, 400, 1.125rem in articles at a 70ch measure; 0.875rem for interface text and list rows).
- **Label** (Public Sans, 0.75rem): meta lines, captions, hints, chips, filter pills. 12px is the floor.
- **Call number** (IBM Plex Mono, 400, 0.75rem, tracking wide, muted): the call number, and literal machine strings (slugs, paths, URLs, code).

### Named Rules
**The One Serif Moment Rule.** Source Serif 4 is for titles and the wordmark only: page titles, the infobox head, dialog titles. Section headings, cards and body stay in Public Sans.

**The Twelve Pixel Floor Rule.** No text under 0.75rem, anywhere, keycaps included.

**The Mono Means Machine Rule.** Plex Mono marks call numbers and literal strings a reader could type or copy. It is not a decorative or numeric face; body figures are already tabular.

## Layout

A 4px rhythm (Tailwind steps 1, 2, 3, 4, 6, 8, 12 are the common ones). A sticky 64px header with a translucent white ground and blur sits above everything, holding the serif wordmark, a centred search pill (max 24rem) with its shortcut keycap, quiet text nav, one primary «Nouvelle fiche» button and icon controls; below `lg` the nav moves into a right hand drawer.

Containers: 80rem (`max-w-7xl`) for the header and the article, 72rem (`max-w-6xl`) for listings and section pages, 48rem for the red link page; horizontal padding 16px, 24px from `sm`. Vertical page padding 32px to 48px (`py-8 lg:py-12`, listings `py-10 lg:py-14`).

The article is a two column grid from `lg`: a body column with a 13rem "Sur cette page" rail at the far right (sticky at 6rem), 48px gutter. The body sits at 70ch; the infobox floats right at 20rem from `lg`, and stacks above the body on smaller screens. Listing rows use a `9rem | 1fr` grid from `sm`, the call number in the first column, moved under the row on phones. The home page splits featured content `1.6fr | 1fr`.

Actions: one per line at full width on phones, a natural row from `sm` (`ACTION_ROW`); the cancel/save pair of the editor and dialog answers split one line evenly. Filter pills stand 40px on phones, 36px from `sm`. Form controls go to 16px text below `sm` to stop iOS zoom.

Every listing handles zero entries with a dashed `EmptyState` inviting creation, never a blank grid. Until `wiki.ready` the layout renders `PageSkeleton`: flat paper bars at the shapes of a title, a lede and a 70ch body, marked `aria-busy`, so the overlay never flashes an empty wiki.

## Elevation & Depth

Flat by default. Depth is tonal and linear: a 1px `paper-200` hairline draws every card, divider and rail, and in dark mode a card lifts one step off the ground (`ink-900` on `ink-950`). Hover strengthens the hairline (`paper-300`) or tints the fill, never raises.

### Shadow Vocabulary
- **Floating** (`shadow-lg`, Tailwind default `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): only on panels floating over content at the bottom of the viewport: the sync prompt, the backup reminder, the connection status and the editor's save toast.
- **Editor menus** (Crepe's own `--crepe-shadow-1/2`): toolbars and slash menus inside Milkdown, which float by nature.

### Named Rules
**The Hairline Rule.** A resting surface is drawn by its border, not a shadow. Shadow is reserved for something that floats over content it does not belong to.

## Shapes

Gently rounded and consistent per role: 6px for nav items, 8px for buttons and the logo, 12px (`rounded-xl`) for cards, the infobox and article images, 16px (`rounded-2xl`) for dialogs, floating panels, the tools menu and dashed empty states, full pills for search, filters, chips, tags and secondary buttons. The two catalogue marks are square: the 32 by 2px title rule, and the 1px rule lines of the table of contents. Category and severity markers are 6 to 8px circles, static.

## Components

### Buttons
- **Shape:** 8px radius for the primary, full pill for secondary.
- **Primary:** accent 700 surface, white text, 14px medium, 36px tall in the header (Flowbite `color="primary"` resolves to the same stops); hover to accent 800. One per view where possible, «Nouvelle fiche» in the header.
- **Alternative:** Flowbite `color="alternative"`, white with a paper hairline, ink text, used for «Modifier» and every secondary action.
- **Destructive:** at rest, an alternative button with catalogue red text (`DANGER_OUTLINE` in `src/lib/config/forms.ts`), for every action that removes or replaces content: the two resets and the demonstration import. The red fill, Flowbite `color="red"`, belongs only to the confirm button of the dialog that follows.
- **Save bar:** a form spread over several cards has one sticky bar at its foot, a muted `role="status"` line on the left saying whether the draft is unsaved, blocked or saved, and the single primary button on the right. Never one submit button per card.
- **Focus:** a 2px accent 500 outline at a 2px offset, site wide.

### Chips
- **Category chip:** full pill, fixed hue tint with a 6px dot, 12px text.
- **Filter pills:** a row of pills over invisible Flowbite radios (`RADIO_OVERLAY`); offered in `paper-200`/`ink-600`, chosen inverted to `ink-800`/`paper-100`. Colour pills keep their own hue and mark the choice with a 2px accent ring.
- **Tags** (live feed): `paper-100` pill, 12px.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** white, `ink-900` in dark mode.
- **Shadow Strategy:** none, see Elevation.
- **Border:** 1px `paper-200`, `ink-700` in dark mode; `.surface-lift` hover to `paper-300`.
- **Internal Padding:** 20px in the infobox, 12px to 24px elsewhere.

### Inputs / Fields
- **Style:** Flowbite fields aliased to the palette; small inputs carry `SMALL_FIELD` to match a small select. Caption above a field is `.field-label` (14px medium, `ink-600`).
- **Focus:** the accent ring.
- **Dark:** fields sit on `ink-900` with `ink-800` borders, never lighter than their card.

### Navigation
- **Header nav:** 14px text in `ink-500`, hover to `ink-900`; the current page is `ink-900`, semibold, with a 2px underline at an 8px offset. No accent in the nav.
- **Mobile:** a 288px right hand drawer `<dialog>` sliding in by CSS, 44px rows, the primary action at the bottom.
- **Table of contents:** a sticky rail with a left hairline; the current section takes an ink border and ink text.
- **Tools tabs:** `ToolsNav`, under the title of the dashboard, the backups and the settings, the three pages behind the header's tools menu. 14px links on a hairline, 44px tall, the current one `ink-900`, semibold, with a 2px bottom border; real links, never in-page tabs. On those pages the tools trigger of the header takes a `paper-100` fill.

### Call number
The heading line of a catalogue card, derived on the fly by `callNumber` in `src/lib/utilities/catalogue.ts`: three letters of the first category, the earliest year among the page's dates, three letters of the title («PEO 1826 MIR»), parts omitted when missing, never stored. Set as `.call-number` in the meta line under an article title and as the first column of a listing row.

### Title block
`PageHeader` and the article header: serif title, then the 32px red `.title-rule`, then the meta line and a muted lede. Nothing above the title but a breadcrumb.

### Links
`.wiki-link`: accent 600 text, 1px accent 300 underline at a 2px offset, thickening to 2px on hover. `.wiki-link-missing`: catalogue red with a dotted underline; it leads to a page inviting creation, never an error. Both must stay after `.article-body` in the components layer so prose does not repaint them.

### Listing row
`EntryCard`: a hairline divided row, call number column, sans title with a stretched link, a lead clamped to one line from `sm` and two on a phone, and a muted meta line with category dots. Enters with `.rise-in`, staggered by `--rank` (45ms, capped at rank 10). In the alphabetical index, each letter stands in a 2rem serif gutter beside its rows, sticky from `sm`, rather than on a line of its own.

### Settings groups
`/settings` is not a stack of cards. Each group is a `.settings-section` (`SettingsSection`): a hairline above it, the `.section-heading` and a muted sentence in a 14rem column on the left, sticky at 6rem from `md`, the controls on the right; below `md` the two stack. The first group drops its hairline under the tools tabs. The reset uses the same frame through `ResetPanel`'s `frame` prop, while `/data` keeps it as a card. The identity group opens with `HeaderPreview`, a faithful miniature of the real header (serif wordmark, logo only when set, search pill, the primary action in the accent being picked), never a badge the header does not render. Featured pages are one hairline divided list, each row naming the place it takes on the home page; a row past the last place says so in signal amber.

### Destination tiles
The online backup on `/data` opens with a «Destination» row of two tiles over invisible radios (`RADIO_OVERLAY`): 12px radius, 1px border, title and a muted hint. The chosen tile takes an ink border (`ink-800`, `paper-200` in dark), not the accent. A destination announced but not built, today S3 compatible storage, is a disabled tile with a dashed `paper-300` border and a «Bientôt» `paper-100` pill; it carries no state until it ships.

### Infobox
A `.surface` aside: optional 16:9 image with caption under a hairline, serif title, a `dl` of label/value rows divided by hairlines, categories at the foot.

## Do's and Don'ts

### Do:
- **Do** draw structure with 1px `paper-200` hairlines and keep resting surfaces shadowless.
- **Do** spend the accent on links and the primary action only; read category and severity colours from `src/lib/config/`.
- **Do** put the serif title, then the 32px red rule, then the meta line with the call number.
- **Do** derive call numbers through `callNumber`, never store or hand write them.
- **Do** lay listings out as divided rows with the call number column, and give every empty listing an inviting `EmptyState`.
- **Do** render `PageSkeleton` until `wiki.ready`.
- **Do** write every colour class with its `dark:` counterpart and check it on the dark ground.
- **Do** honour reduced motion: entrances are CSS (`--ease-rise`, 380ms rise, 200ms swap) and the media query in `app.css` flattens them.

### Don't:
- **Don't** put a kicker or eyebrow label above a heading; a page title has only a breadcrumb above it.
- **Don't** lay listings out as card grids.
- **Don't** set any text under 12px.
- **Don't** use pulsing or pinging dots; status markers are static.
- **Don't** use the serif for section headings, cards or body text.
- **Don't** use Plex Mono as decoration or for figures.
- **Don't** colour categories or severities from `accent-*`.
- **Don't** return to the cream paper editorial skin or warm tinted neutrals.
- **Don't** add shadows to resting cards.
