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
rounded:
  none: "0px"
  tight: "2px"
  standard: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
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
---

# Design System: DocuMind AI

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
- **Label** (600, 14px, 1.4): Buttons, navigation, and controls. Supporting metadata may use 12–13px at weight 400 or higher when contrast holds.

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
