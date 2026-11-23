---
name: DocuMind AI
description: A clear document workspace with a tactile pastel neobrutalist interface.
colors:
  ink: "#000000"
  cream: "#FFFDF5"
  white: "#FFFFFF"
  mint: "#88D498"
  sky: "#74B9FF"
  butter: "#FFD23F"
  mint-tint: "#D8F0DC"
  sky-tint: "#D4EAFF"
  butter-tint: "#FFE99A"
  # Front page (/) surface: tokens prefixed front-, scoped under .landing in src/landing.css
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
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  micro:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
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
  tight: "2px"
  subtle: "3px"
  standard: "4px"
  front-square: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  front-grid: "32px"
  front-mark-gutter: "56px"
  front-offset-frame: "10px"
  front-wrap: "1312px"
components:
  button-primary:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.standard}"
    padding: "12px 16px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.standard}"
    padding: "10px 14px"
    height: "42px"
  input-search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 10px"
    height: "42px"
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

**Surface scope.** This file holds two systems. The workspace (/workspace) and every application surface use the pastel neobrutalist system below, "The Paper Workbench", unprefixed tokens. The front page (/) uses its own cyber-brutalist red system, "The Instrument Sheet", recorded under **Front Page System (/)** at the end of this file with tokens prefixed `front-`. Do not mix the two: a workspace screen never takes signal red or Anton, and the front page never takes mint, sky, butter, or hard offset shadows. The workspace keeps the pastel system until the user decides to carry the front-page look over.

## Overview

**Creative North Star: “The Paper Workbench”**

DocuMind AI pairs a warm reading surface with the clear geometry of a working desk. Strong black strokes and compact, tactile controls make actions easy to locate. Mint, sky, and butter mark the upload path, file types, and workspace state without suggesting that unimplemented AI services are active.

The dashboard is a working surface, so headings stay compact, controls stay familiar, and document rows remain calm to scan. The dark theme uses near-black surfaces with the same pastel accents. It retains the same hierarchy and keyboard affordances.

**Key Characteristics:**

- Warm cream canvas and pitch-black text and structure.
- Mint, sky, and butter used as clear surface signals.
- Crisp 2–3px borders, square corners, and hard offset shadows.
- Space Grotesk headings with DM Sans interface text.
- Prototype and sample states labeled plainly.

## Colors

The palette uses black for legibility and structure, cream for the main light canvas, and three soft accents for action and classification.

### Primary

- **Soft Mint** (#88D498): Primary action and active workspace state.

### Secondary

- **Sky Blue** (#74B9FF): Secondary actions and DOC/DOCX file markers.

### Tertiary

- **Butter Yellow** (#FFD23F): Prototype notices, sample markers, and PDF file markers.

### Neutral

- **Pitch Black** (#000000): Light-theme text, strokes, and hard shadow color.
- **Warm Cream** (#FFFDF5): Main light-theme canvas.
- **Paper White** (#FFFFFF): Inputs and quiet content surfaces.
- **Mint Tint** (#D8F0DC), **Sky Tint** (#D4EAFF), **Butter Tint** (#FFE99A): Secondary status fills and metric surfaces.

### Named Rules

**The Honest Surface Rule.** Sample files are marked as samples; items added by the user are labeled local; planned AI and server capabilities are described as unavailable.

**The Three Pastels Rule.** Use the named mint, sky, and butter palette. Do not add gradients, glow, or glass effects.

## Typography

**Display Font:** Space Grotesk, sans-serif  
**Body Font:** DM Sans, sans-serif  
**Label Font:** DM Sans, sans-serif

**Character:** Space Grotesk gives workspace titles a firm, compact voice. DM Sans keeps filenames, help text, and controls easy to read.

### Hierarchy

- **Display** (700, 24–32px, 1.12): App page titles.
- **Headline** (700, 24px, 1.2): Main section headings.
- **Title** (700, 20px, 1.25): Upload panel headings and compact component titles.
- **Body** (400, 16px, 1.5): Explanatory text and reading content.
- **Label** (600, 14px, 1.4): Buttons, navigation, and primary controls.
- **Caption** (500, 12–13px, 1.3): Timestamps, relative time, and secondary metadata descriptions.
- **Micro** (700, 10–11px, 1.2): Engine badges, source locators, table cell coordinates, and pill tags (uppercase with 0.03em tracking).

Use tabular figures for changing counts. Keep body text left aligned and allow filenames to wrap or truncate only when the full filename remains available as a title.

## Layout

The desktop shell uses a fixed 248px navigation rail and a fluid content area capped at 1250px. Keep a consistent 24–64px canvas inset, 12–16px between related controls, and 30–40px between major sections. The upload action and local-prototype explanation share the first working area; the document library follows directly beneath.

At 1120px, reduce the rail and let the upload copy wrap before its action. At 900px, stack the upload and prototype panels and place the search toolbar on separate rows. At 760px, replace the rail with a compact header and an expandable mobile navigation sheet. Keep 16–20px page margins on phones. At 480px, stack document cards and keep file controls thumb-sized.

## Elevation & Depth

Use hard offset shadows as structural neobrutalist depth. A resting panel may use a 3px offset; the primary action may use 4px. Never use blur, ambient shadow, glow, or a gradient. Pressed buttons move into the plane and collapse their shadow. Borders remain the primary edge cue.

## Shapes

Use square corners for the outer frame and document rows. Standard controls may use a consistent 4px radius. Borders are 2px for controls and panels, with a 3px dashed stroke for the upload target. Avoid pills except where a small file or state label benefits from a compact tag.

## Components

### Buttons

- **Primary:** Mint fill, black 2px stroke, 4px hard offset shadow, 46px minimum height. On press, translate 4px and remove the shadow.
- **Secondary:** White fill, black 2px stroke, 3px hard offset shadow, 42px minimum height.
- **Focus:** A visible 3px sky-blue outline with a 3px offset.

### Chips

- **Style:** Rectangular 1.5px black border, 12px readable text, mint or butter fill according to meaning.
- **State:** “Sample” identifies example documents. “Local” identifies files added in the current page session.

### Cards / Containers

- **Corner Style:** Square for list rows; 4px for interactive controls.
- **Background:** Cream for canvas, white for document rows and inputs, pastel tints for the three workspace status panels.
- **Shadow Strategy:** Hard black offset on primary actions and the status panels; none on ordinary rows.
- **Border:** 2px solid black; upload target uses 3px dashed black.
- **Internal Padding:** 10–17px for rows and status panels; 16–26px for primary work areas.

### Inputs / Fields

- **Style:** White fill, 2px black stroke, square corners, 16px search input text.
- **Focus:** Visible sky-blue outer outline.
- **Error / Disabled:** State copy stays explicit; do not rely on color alone.

### Navigation

Keep the brand and workspace scope at the top of the desktop rail. Use plain 14px labels, neutral icons, and a mint active row with a black outline. On phones, show the brand, menu toggle, and theme toggle; the menu opens a full-height sheet with Overview, Documents, and planned destinations.

## Do's and Don'ts

### Do:

- **Do** use the exact palette values: #FFFDF5, #000000, #88D498, #74B9FF, and #FFD23F.
- **Do** mark all sample data and prototype-only behavior.
- **Do** keep AI, upload-to-server, parsing, comparison, and citations labeled as planned until implemented.
- **Do** provide keyboard focus and a reduced-motion path.

### Don't:

- **Don't** add gradients, glow, glass, or extra accent colors.
- **Don't** imply a file is uploaded, persisted, parsed, or analyzed when it remains in page memory.
- **Don't** use low-contrast gray for running text.

## Front Page System (/)

This section governs the marketing front page at / only (src/LandingPage.jsx, styled by src/landing.css under the `.landing` scope). Its tokens carry the `front-` prefix in the frontmatter. Everything above this section governs the workspace.

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

**The Two Faces Rule.** Anton is reserved for display and headline sizes and the large preview figures. Everything else is Martian Mono at width 87.5; never introduce a third family or a system display face.

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
- **Don't** carry front-page tokens into the workspace until the user decides to move the workspace to this system.
