---
name: DocuMind AI
description: A document workspace printed like an instrument sheet; one signal red, 1px lines, mono interface, serif reading.
colors:
  # Workspace (/workspace): unprefixed tokens, CSS custom properties on :root in src/styles.css
  ink: "#0b0b0b"
  paper: "#f1f1ef"
  surface: "#ffffff"
  muted: "#55554f"
  line: "rgba(11, 11, 11, 0.14)"
  red: "#d3110f"
  red-tint: "#fbe2e1"
  on-red: "#ffffff"
  grey-strong: "#dcdcd7"
  grey-mid: "#e6e6e2"
  grey-soft: "#e9e9e5"
  grey-tint: "#ebebe8"
  grey-faint: "#f4f4f2"
  # Workspace dark theme (.dark on the .app root)
  dark-ink: "#f1f1ef"
  dark-paper: "#0b0b0b"
  dark-surface: "#161616"
  dark-muted: "#a3a39d"
  dark-line: "rgba(241, 241, 239, 0.16)"
  dark-red: "#ff3b30"
  dark-red-tint: "#3a1513"
  dark-grey-strong: "#2c2c2a"
  dark-grey-mid: "#242422"
  dark-grey-soft: "#262624"
  dark-grey-tint: "#1f1f1e"
  dark-grey-faint: "#1b1b1a"
  dark-grey-faint-alt: "#1d1d1c"
  # Front page (/): tokens prefixed front-, scoped under .landing in src/landing.css
  front-ground: "#f1f1ef"
  front-panel: "#ffffff"
  front-ink: "#0b0b0b"
  front-muted: "#55554f"
  front-line: "rgba(11, 11, 11, 0.14)"
  front-frame: "#0b0b0b"
  front-red: "#d3110f"
  front-red-tint: "#fbe2e1"
  front-close-muted: "#c9c9c4"
typography:
  display:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
    fontVariation: "'wdth' 87.5"
  title:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.3
    fontVariation: "'wdth' 87.5"
  body:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'wdth' 87.5"
  label:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 87.5"
  caption:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    fontVariation: "'wdth' 87.5"
  micro:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.3
    fontVariation: "'wdth' 87.5"
  read:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  front-display:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "86px"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  front-headline:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "68px"
    fontWeight: 400
    lineHeight: 0.95
  front-title:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.35
    fontVariation: "'wdth' 87.5"
  front-body:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    fontVariation: "'wdth' 87.5"
  front-label:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 87.5"
  front-readout:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
    fontVariation: "'wdth' 87.5"
  front-stamp:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    fontVariation: "'wdth' 87.5"
rounded:
  none: "0px"
  front-square: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  rail: "248px"
  content-max: "1250px"
  front-grid: "32px"
  front-mark-gutter: "56px"
  front-offset-frame: "10px"
  front-wrap: "1312px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "46px"
  nav-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "42px"
  nav-link-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
  tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
  pill-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "44px"
  drop-zone:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px"
    height: "176px"
  drop-zone-hover:
    backgroundColor: "{colors.red-tint}"
  document-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
    height: "68px"
  reader-chunk-highlight:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.read}"
    rounded: "{rounded.none}"
  front-button-primary:
    backgroundColor: "{colors.front-ink}"
    textColor: "{colors.front-panel}"
    typography: "{typography.front-label}"
    rounded: "{rounded.front-square}"
    padding: "12px 20px"
    height: "48px"
  front-button-primary-hover:
    backgroundColor: "{colors.front-red}"
    textColor: "{colors.front-panel}"
  front-button-close:
    backgroundColor: "{colors.front-red}"
    textColor: "{colors.front-panel}"
    typography: "{typography.front-label}"
    rounded: "{rounded.front-square}"
    padding: "12px 20px"
    height: "56px"
  front-button-close-hover:
    backgroundColor: "{colors.front-panel}"
    textColor: "{colors.front-ink}"
  front-stamp:
    backgroundColor: "{colors.front-panel}"
    textColor: "{colors.front-red}"
    typography: "{typography.front-stamp}"
    rounded: "{rounded.front-square}"
    padding: "2px 8px"
    height: "26px"
  front-stamp-hover:
    backgroundColor: "{colors.front-red}"
    textColor: "{colors.front-panel}"
  front-tab:
    backgroundColor: "{colors.front-panel}"
    textColor: "{colors.front-ink}"
    typography: "{typography.front-readout}"
    rounded: "{rounded.front-square}"
    padding: "12px 20px"
    height: "48px"
  front-tab-active:
    backgroundColor: "{colors.front-ink}"
    textColor: "{colors.front-panel}"
  front-readout:
    backgroundColor: "{colors.front-panel}"
    textColor: "{colors.front-ink}"
    typography: "{typography.front-readout}"
    rounded: "{rounded.front-square}"
    padding: "9px 12px"
---

# Design System: DocuMind AI

**Surface scope.** Both shipping surfaces use one system, "The Instrument Sheet". The workspace (/workspace) and every application surface carry it through the unprefixed tokens above, defined as CSS custom properties on `:root` and `.dark` in src/styles.css; the sections from Overview to Do's and Don'ts below describe that workspace adaptation. The front page (/) carries the same world through its own `front-` tokens scoped under `.landing` in src/landing.css, recorded under **Front Page System (/)**. The two share ground, ink, frame, and signal red; they differ in density (the front page is a poster, the workspace a quiet tool) and in one face (the workspace adds a serif for reading). The earlier pastel system, "The Paper Workbench", is retired from every shipping surface as of 2026-11-23 and is kept at the end of this file as history only; none of its tokens or devices may be used on new work.

## Overview

**Creative North Star: "The Instrument Sheet"**

The workspace is the same printed instrument sheet as the front page, set down as a working tool. A light grey ground holds white panels framed in 1px black; corners are square; nothing casts a shadow. The interface speaks in narrow Martian Mono, the page title alone in uppercase Anton, and everything a person reads at length (document passages, answers, quoted excerpts) in Source Serif 4.

Layouts stay familiar and calm: a fixed rail, a capped content column, hairline-ruled rows. Signal red is reserved for the few things that matter at any moment: the primary action under the pointer, the current selection, progress and live work, and keyboard focus. Where something is merely current (the active nav item, the selected document, the active tab), it is a solid ink bar, not a colour. Dark mode is the same sheet inverted: near-black ground, charcoal panels, off-white ink, a brighter red.

**Key Characteristics:**

- Instrument grey ground, white panels, near-black ink, one signal red.
- 1px strokes everywhere; square corners; no block shadows.
- Martian Mono (width 87.5) for the interface, Anton for the page title only, Source Serif 4 for reading.
- The current place is a solid ink bar; red marks primary, selected, live, and focus.
- Former pastel state fills are neutral greys; the only tint is pale red.
- Dark mode is the same system inverted, not a second palette.

## Colors

A near-monochrome sheet with one signal accent and a ladder of neutral greys for state.

### Primary

- **Signal Red** (`red`; dark `dark-red`): Primary-action hover fill, the dashed upload frame, progress fills, the highlighted reader chunk frame, card and status-pill hover frames, text selection, keyboard focus, and destructive or failed states (danger buttons, failed badges). Never a fill for notices or reading panels.
- **Red Tint** (`red-tint`; dark `dark-red-tint`): The highlighted reader chunk and the upload zone on hover. Its only fills.
- **On Red** (`on-red`): White label on any red fill, in both themes.

### Neutral

- **Press Black** (`ink`; dark `dark-ink` off-white): Type, every 1px frame, primary-action fill, and the solid bar of the active nav item, selected pill, and active tab.
- **Instrument Grey** (`paper`; dark `dark-paper`): Page ground, the rail, and the label colour on ink-filled controls.
- **Sheet White** (`surface`; dark `dark-surface` charcoal): Panels, document rows, inputs, the upload zone, and PDF file markers.
- **Graphite** (`muted`; dark `dark-muted`): Secondary copy, subtitles, metadata.
- **Hairline** (`line`; dark `dark-line`): Internal rules and row dividers.
- **State Greys** (`grey-strong`, `grey-mid`, `grey-soft`, `grey-tint`, `grey-faint`; dark `dark-grey-*`): Neutral fills for hover rows, file-type markers, metric and status surfaces. They occupy the slots the pastels used to fill (CSS `--mint`, `--sky`, `--butter`, `--mint-tint`, `--sky-tint`/`--butter-tint`), so state reads by shape, label, and ink, never by hue.

### Named Rules

**The Red Means Now Rule.** Red marks only what is primary, selected, live, focused, or failing. It is never a fill for a notice, banner, or reading panel; a notice is a framed white panel with ink text.

**The Ink Bar Rule.** The current place (active nav item, selected document pill, active tab) is a solid ink bar with paper-coloured text. Never a pastel, never a red fill.

**The Honest Surface Rule.** Sample files are marked as samples; items added by the user are labeled local; planned AI and server capabilities are described as unavailable.

## Typography

**Display Font:** Anton (with Arial Narrow, sans-serif)
**Body Font:** Martian Mono (with ui-monospace, monospace), width axis 87.5
**Reading Font:** Source Serif 4 (with Georgia, serif)

**Character:** Mono at 87.5 width makes every control and label read as instrument print; Anton gives the page a single poster-weight title that ties it to the front page; the serif lets long passages and answers read like a document rather than a terminal.

### Hierarchy

- **Display** (Anton 400, clamp 1.75–2.25rem, 1.12, -0.01em, uppercase; 1.65–1.9rem on phones): The page h1 only.
- **Headline** (Martian Mono 700, 19–20px, 1.2–1.25): Panel and section headings.
- **Title** (Martian Mono 700, 15–17px, 1.3): Card titles, reader and evidence headings.
- **Body** (Martian Mono 400, 16px, 1.5): Subtitles, explanatory copy, search input text.
- **Label** (Martian Mono 700, 14px, 0.04em, uppercase on buttons): Buttons and navigation; tabs and pills at 13px.
- **Caption** (Martian Mono 600, 12px, 1.3–1.5): Metadata, timestamps, notes.
- **Micro** (Martian Mono 700, 10–11px, 1.3): Badges, locator tags, counts.
- **Read** (Source Serif 4 400, 1.0625rem, 1.65, width axis reset): Reader chunk text, chat answer bubbles, and every quoted excerpt.

Use tabular figures for changing counts.

### Named Rules

**The Three Roles Rule.** Martian Mono for the interface, Anton for the page title only, Source Serif 4 for reading text only. No fourth family; Anton never appears below the h1, and the serif never sets a control.

## Layout

The desktop shell keeps a fixed 248px rail with a 1px ink right rule and a fluid content column capped at 1250px, inset clamp(24px, 4vw, 64px). Related controls sit 8–16px apart; major sections 28–32px. The upload panel and its companion panel share the first row; the document library follows in hairline rows.

At 1120px the rail compacts; at 900px the upload panels and toolbar stack; at 760px the rail becomes a compact header with a full-height menu sheet; at 640px document rows move their actions to a second full-width line and the status pills wrap from the left edge; at 480px cards stack and the primary action runs full width.

## Elevation & Depth

Flat. The workspace casts no block shadows (`--shadow-hard: none`). Depth comes from line work and inversion: 1px ink frames on white panels over the grey ground, hairline rules inside them, and the solid ink bar for the current place. Hover never lifts a card or pill; it changes the frame to red.

### Named Rules

**The Line-Not-Shadow Rule.** Lift is drawn, never cast. Use a frame, a hairline, or inversion; never a block shadow, blur, or glow.

## Shapes

Square corners throughout (`--radius: 0`). Strokes are 1px: solid ink for frames, controls, and rows; hairline for internal rules; red dashed for the upload target; red solid for hover and the highlighted reader chunk. Small round status dots are the only circles.

## Components

### Buttons

- **Shape:** Square (0px), 1px ink frame, 46px minimum height, 0 16px padding.
- **Primary** (`.primary-button`, the ask-document action, the reader return action): Ink fill, paper-coloured uppercase label at 0.04em.
- **Hover / Focus:** Fill and frame turn red with a white label and a 1px up-left nudge (140ms, cubic-bezier(0.23, 1, 0.32, 1)); press drops 1px. Focus is a 2px red outline at 2px offset.
- **Secondary:** White fill, ink frame and label, uppercase; inside the upload zone it fills red on hover.

### Chips / Pills

- **Style:** Square, 1px ink frame, grey ground, 13px 600 mono.
- **State:** Selected inverts to the ink bar. Status pills are white, framed in ink, and take a red frame on hover with no movement.

### Cards / Containers

- **Corner Style:** Square.
- **Background:** Sheet White over Instrument Grey; state greys for metric and status surfaces.
- **Shadow Strategy:** None; see Elevation & Depth.
- **Border:** 1px ink; document cards turn the frame red on hover with no movement.
- **Internal Padding:** 12–16px for rows; 24px for the upload zone and primary work areas.

### Inputs / Fields

- **Style:** White fill, 1px ink frame, square, 44px tall, 16px mono text.
- **Focus:** The red focus outline.

### Navigation

Brand and workspace scope at the top of the rail; 14px 600 mono labels with neutral line icons; hover a neutral grey row; the active item is the ink bar, its count badge outlined in paper. On phones the rail becomes a header with menu and theme toggles opening a full-height sheet.

### Tabs

Search mode tabs are framed 13px 700 mono buttons; the active tab is the ink bar.

### Upload Zone

A white panel framed by a 1px red dashed line, 176px minimum height; on hover it takes the red tint.

### Reader

Chunks read in Source Serif 4; the highlighted chunk is framed in 1px red on the red tint, with no shadow.

## Do's and Don'ts

### Do:

- **Do** keep red for primary, selected, live, focus, and failure, and the ink bar for the current place.
- **Do** draw every edge as a 1px stroke and keep corners square.
- **Do** set reading text (document chunks, answers, excerpts) in Source Serif 4 and everything else in Martian Mono at width 87.5.
- **Do** keep Anton to the page h1.
- **Do** mark all sample data and prototype-only behavior, and keep unimplemented AI and server capabilities labeled as planned.
- **Do** provide visible keyboard focus and a reduced-motion path.

### Don't:

- **Don't** use red as a fill for notices, banners, or reading panels.
- **Don't** use block shadows, hard offset shadows, blur, glow, gradients, or rounded corners.
- **Don't** bring back mint, sky, or butter hues, or add a second accent.
- **Don't** lift cards or pills on hover; change the frame instead.
- **Don't** imply a file is uploaded, persisted, parsed, or analyzed when it remains in page memory.
- **Don't** use low-contrast grey for running text.

## Front Page System (/)

This section governs the marketing front page at / (src/LandingPage.jsx, styled by src/landing.css under the `.landing` scope). Its tokens carry the `front-` prefix in the frontmatter. It is the same Instrument Sheet as the workspace, set at poster density; the sections above govern the workspace.

### Overview

**Creative North Star: "The Instrument Sheet"**

The front page presents DocuMind as a machine that checks the visitor's own browser live and shows its work. It reads like a printed instrument sheet: a light grey ground ruled with hairlines, black 1px frames, square corners, huge uppercase Anton, and every other word in a narrow monospace. One signal red marks what the machine is pointing at: labels, the cited line, stamps, and live states.

Density is high but ordered. Content sits in framed ledgers and ruled rows rather than floating cards, and depth comes from line work, never from blur or block shadows. Every readout shows real data from the visitor's browser or the product's documented facts.

**Key Characteristics:**

- Light grey ground, white framed panels, near-black ink, one red.
- 1px black frames and 1px hairline grids; square corners throughout.
- Anton for display, Martian Mono at width 87.5 for body, labels, readouts, and buttons.
- Numbered section marks in a gutter beside the heading.
- Live readouts bound to real browser checks.

### Colors

A near-monochrome sheet with a single signal accent.

#### Primary

- **Signal Red** (#d3110f): Section marks, the cited line in the page scan, the scan beam, stamps, citation markers, focus rings, live-state squares, button hover, and the close button. Never a fill for large reading areas.

#### Neutral

- **Instrument Grey** (#f1f1ef): Page ground, the hairline-grid fields, source excerpts, and the offset second frame.
- **Sheet White** (#ffffff): Framed panels: ledger, readout box, scanned page, preview window, playground, facts.
- **Press Black** (#0b0b0b): Type, 1px frames, the primary button, active tabs and steps, the "DocuMind" ledger column head, and the closing band.
- **Graphite** (#55554f): Secondary copy, readout keys, the cloud column of the ledger, footer notes.
- **Hairline** (rgba(11, 11, 11, 0.14)): Internal rules, row dividers, and the 32px background grid.
- **Red Tint** (#fbe2e1): Search-match highlight behind red text and the targeted facts row. Its only uses.
- **Close Grey** (#c9c9c4): Secondary text and key outlines on the black closing band.

#### Named Rules

**The One Red Rule.** Signal red is the only accent on the front page. It marks what the machine points at; it never decorates. No second accent, no pastels, no gradients beyond the flat hairline grid.

**The Real Readout Rule.** Every number or status the page displays comes from the visitor's browser (WebGPU, free storage, model cache) or from documented product facts. A readout without a real source does not ship.

### Typography

**Display Font:** Anton (with Arial Narrow, sans-serif)
**Body Font:** Martian Mono (with ui-monospace, SFMono-Regular, Menlo, monospace), width axis 87.5
**Label/Mono Font:** Martian Mono, the same face

**Character:** Anton is a poster voice set huge and uppercase; Martian Mono, narrowed to 87.5 width, reads as instrument print. The contrast between the two is the whole type system.

#### Hierarchy

- **Display** (Anton 400, clamp 52–86px, 0.92, -0.01em, uppercase): The hero headline only, three to four lines.
- **Headline** (Anton 400, clamp 38–68px, 0.95, uppercase): Section headings; the closing heading runs up to 112px.
- **Title** (Martian Mono 700, 14px, 1.35, uppercase): Fact rows and question headings.
- **Body** (Martian Mono 400, 15px, 1.6; lead copy 1.75 at 46–62ch): Lead copy, answers, explanations.
- **Label** (Martian Mono 600, 13px, 0.04em, uppercase): Buttons, navigation, text links, section marks.
- **Readout** (Martian Mono 600, 12px, 1.4): Readout rows, captions, status bar, panel metadata.
- **Stamp** (Martian Mono 700, 11px, uppercase): Ledger stamps, fact stamps, sample marks.

#### Named Rules

**The Two Faces Rule.** On the front page, Anton is reserved for display and headline sizes and the large preview figures. Everything else is Martian Mono at width 87.5; never introduce a third family or a system display face. (The workspace's reading serif does not apply here; the front page has no long reading text.)

### Layout

A full-bleed sheet divided by 1px black rules. Sections stack full width, each closed by a 1px frame line, with content capped at 1312px and a fluid side gutter (clamp 20px to 64px). The hero and demo split into two columns separated by a vertical frame line; the hero's right half and the preview side are hairline-grid fields at 32px.

Section marks /01 to /07 sit in a 56px gutter column beside the heading's first line, topped by a 1px red rule (40px gutter at 760px and below). Facts are ruled rows inside one frame; the comparison is a three-column ledger; questions are a two-column ruled list.

Breakpoints: at 1180px the hero's vertical rail is removed; at 960px the header shrinks to 64px and the hero, demo, playground, and close stack to one column; at 760px nav links hide, the ledger becomes per-row cards with data labels, and fact rows stack; at 480px the hero headline runs full width and buttons stack.

### Elevation & Depth

Flat. No box shadows of any kind. Depth comes from line work: 1px black frames on white panels over the grey ground, hairline grids behind featured visuals, and one device for lift, the offset second frame: a second 1px black frame filled with the ground color, set 10px down and right behind the scanned page (6px on phones). Inversion (black fill, white type) marks the active tab, step, ledger column, and the closing band.

#### Named Rules

**The Line-Not-Shadow Rule.** Lift is drawn, never cast. Use a frame, a hairline, an offset second frame, or inversion; never a block shadow, blur, or glow.

### Shapes

Square corners everywhere (0px). Borders are 1px: black for frames and buttons, hairline for internal rules, red for stamps and marks, dashed hairline only for panel footers and citation lists. Recurring geometry: 14px corner crosshairs on the scan field, 8px solid red squares for live states, and the trailing red underscore after the wordmark.

### Components

#### Buttons

- **Shape:** Square (0px), 1px frame, 48px minimum height.
- **Primary:** Press Black fill, white uppercase label (600, 13px, 0.04em), 12px 20px padding, red arrow icon.
- **Hover / Focus:** Fill and frame turn Signal Red, the arrow turns white and nudges 2px up-right (160ms, cubic-bezier(0.22, 1, 0.36, 1)); press drops 1px. Focus is a 2px red outline at 3px offset.
- **Close button:** On the black closing band the primary flips to a red fill at 56px; hover turns it white with black text.
- **Text link:** Uppercase label with a red bracket mark, turns red on hover.

#### Stamps

- **Style:** 1px red frame, red uppercase 11px text, white ground, 2px 8px padding.
- **State:** Ledger stamps are links that fill red with white text on hover; fact stamps and sample marks are static.

#### Cards / Containers

- **Corner Style:** Square.
- **Background:** Sheet White inside a 1px black frame, over Instrument Grey.
- **Shadow Strategy:** None; see Elevation & Depth.
- **Border:** 1px black outer frame, hairline internal rules.
- **Internal Padding:** 18–22px for ledger and fact rows; 20–32px for playground panels.

#### Navigation

Fixed 72px header (64px at 960px) on the grey ground with a 1px black bottom rule. Uppercase 13px mono links separated by red slashes, red on hover; the black primary button sits at the right. The bottom status bar repeats the action as a red block that turns black on hover.

#### Readout Box

A framed two-column list: uppercase Graphite keys at 96px, a hairline divider, and values in 600 weight. Values resolve from real browser checks; resolved states carry a red marker.

#### Tabs

Playground prompts are a row of mono tabs split by hairlines; hover turns the label red, the active tab inverts to black.

### Do's and Don'ts

#### Do:

- **Do** keep Signal Red (#d3110f) as the only accent, used for section marks, the cited line, stamps, citations, and live states.
- **Do** draw depth with 1px frames, hairlines, the offset second frame, or inversion.
- **Do** bind every readout to a real browser check or a documented product fact, and show an honest unknown when a check cannot resolve.
- **Do** set section numbers /01 to /07 in the gutter beside the heading's first line, topped by a 1px red rule.
- **Do** keep Anton for display and headline sizes and Martian Mono at width 87.5 for everything else.

#### Don't:

- **Don't** use block shadows, hard offset shadows, blur, glow, or rounded corners on the front page.
- **Don't** add a second accent color or carry mint, sky, or butter onto the front page.
- **Don't** invent stats, user counts, customer names, or logos.
- **Don't** place section numbers above a heading as an eyebrow or kicker.

## Retired: The Paper Workbench (superseded 2026-11-23)

**History only. Do not use on any surface.** This pastel neobrutalist system governed the workspace until 2026-11-23, when the workspace moved to the Instrument Sheet. Its tokens have been removed from the frontmatter and from src/styles.css (the CSS variable names `--mint`, `--sky`, `--butter` and their tints survive but now hold neutral greys). It is recorded so that leftover class names and comments in the code can be understood, not imitated.

### What it was

- **North Star:** "The Paper Workbench": a warm reading surface with the clear geometry of a working desk.
- **Palette:** Warm Cream canvas (#FFFDF5), Pitch Black text and structure (#000000), Paper White (#FFFFFF); Soft Mint (#88D498) for primary action and active state, Sky Blue (#74B9FF) for secondary actions and DOC/DOCX markers and focus outlines, Butter Yellow (#FFD23F) for prototype notices and PDF markers; tints Mint (#D8F0DC), Sky (#D4EAFF), Butter (#FFE99A) for status panels.
- **Type:** Space Grotesk 700 headings (20–32px) with DM Sans interface text (11–16px).
- **Depth and shape:** Hard black offset shadows (3px on panels, 4px on the primary action, collapsing on press); 2px black strokes, a 3px dashed upload target, square rows and 4px control radius.
- **Rules it held:** The Three Pastels Rule (mint, sky, butter only; no gradients, glow, or glass) and The Honest Surface Rule, which carries forward unchanged into the Instrument Sheet.
