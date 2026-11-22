# 001 — Animate progress meters with scaleX

- **Status**: DONE
- **Commit**: 5df8997
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 4 files, small CSS and inline-style edits

## Problem

Three meters animate `width`. Width changes layout on every update. The on-device model download writes that width on every progress tick, so the page pays layout and paint for a bar that only needs to grow.

Constant motion (progress) must use `linear`. UI motion must animate `transform` and `opacity` only.

```css
/* Documind-ai/src/styles.css:388 — current */
.ai-progress-fill { height: 100%; background: var(--mint); transition: width 180ms ease; }
```

```css
/* Documind-ai/src/styles.css:867 — current */
.diag-progress-fill {
  height: 100%;
  background: var(--mint);
  transition: width 200ms ease;
}
```

```css
/* Documind-ai/src/styles.css:2678 — current */
.token-progress-fill {
  height: 100%;
  transition: width 240ms ease;
}
```

```jsx
/* Documind-ai/src/features/documents/components/AiAssistantView.jsx:222 — current */
<div
  className="ai-progress-fill"
  style={{ width: `${Math.round((modelProgress?.progress || 0) * 100)}%` }}
/>
```

```jsx
/* Documind-ai/src/features/documents/components/StorageHardwareModal.jsx:156 — current */
<div className="diag-progress-fill" style={{ width: `${Math.max(2, usagePercent)}%` }} />
```

`usagePercent` is `0` when there is no quota, otherwise clamped to `1..100` (`StorageHardwareModal.jsx:90`). The inline `Math.max(2, usagePercent)` forces a 2% minimum only when a quota exists. A zero quota must stay empty, not 2%.

```jsx
/* Documind-ai/src/features/documents/components/TokenGovernanceModal.jsx:117 — current */
<div
  className={`token-progress-fill ${percentUsed > 90 ? 'fill-danger' : percentUsed > 70 ? 'fill-warning' : 'fill-ok'}`}
  style={{ width: `${percentUsed}%` }}
/>
```

`percentUsed` is already `Math.min(100, Math.round(metrics.usageRatio * 100))` (`TokenGovernanceModal.jsx:48`).

The tracks already clip overflow:

```css
/* Documind-ai/src/styles.css:387 — current */
.ai-progress-track { width: 100%; height: 10px; border: 1.5px solid var(--ink); background: var(--paper); overflow: hidden; }
```

```css
/* Documind-ai/src/styles.css:859 — current */
.diag-progress-bar {
  width: 100%;
  height: 8px;
  border: 1.5px solid var(--ink);
  background: var(--paper);
  margin-bottom: 12px;
  overflow: hidden;
}
```

```css
/* Documind-ai/src/styles.css:2669 — current */
.token-progress-track {
  width: 100%;
  height: 12px;
  background: rgba(0, 0, 0, 0.08);
  border: 2px solid var(--ink);
  border-radius: 6px;
  overflow: hidden;
}
```

## Target

Each fill is `width: 100%` and grows with `transform: scaleX(<fraction>)` from the left edge. Fractions are clamped to `0..1`. Durations stay the ones already on each meter. Easing is `linear` because this is progress, not an entrance.

Do not use `scale(0)` as an entrance. `scaleX(0)` here is the empty meter value, which is correct.

```css
/* target — replace the three fill rules */
.ai-progress-fill {
  height: 100%;
  width: 100%;
  background: var(--mint);
  transform-origin: left center;
  transition: transform 180ms linear;
}
.diag-progress-fill {
  height: 100%;
  width: 100%;
  background: var(--mint);
  transform-origin: left center;
  transition: transform 200ms linear;
}
.token-progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  transition: transform 240ms linear;
}
```

Keep `.fill-ok`, `.fill-warning`, and `.fill-danger` as they are. They only set `background`.

The existing `prefers-reduced-motion` block at `styles.css:574` is earlier in the file than these rules, so a `transition: none` there would lose to the later `transition` declarations. Add a second block after `.token-progress-fill`:

```css
@media (prefers-reduced-motion: reduce) {
  .ai-progress-fill,
  .diag-progress-fill,
  .token-progress-fill {
    transition: none;
  }
}
```

Inline styles. Set `transform` on the fill itself. Do not drive the scale through a custom property on the parent.

```jsx
/* AiAssistantView.jsx target */
<div
  className="ai-progress-fill"
  style={{ transform: `scaleX(${Math.min(1, Math.max(0, modelProgress?.progress || 0))})` }}
/>
```

`modelProgress.progress` is already a `0..1` fraction. Do not multiply by 100. Leave the percent label (`Math.round(... * 100)%`) untouched.

```jsx
/* StorageHardwareModal.jsx target */
<div
  className="diag-progress-fill"
  style={{ transform: `scaleX(${usagePercent === 0 ? 0 : Math.max(2, usagePercent) / 100})` }}
/>
```

```jsx
/* TokenGovernanceModal.jsx target */
<div
  className={`token-progress-fill ${percentUsed > 90 ? 'fill-danger' : percentUsed > 70 ? 'fill-warning' : 'fill-ok'}`}
  style={{ transform: `scaleX(${percentUsed / 100})` }}
/>
```

## Repo conventions to follow

Motion in the workspace is plain CSS in `Documind-ai/src/styles.css`. There is no shared `--ease-out` token in that file. Do not invent one in this plan.

The shelf toast is the exemplar for animating `transform` instead of layout (`Documind-ai/src/styles.css:152`):

```css
.toast { transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1); }
```

Do not copy that curve onto these meters. Progress uses `linear`. Entrances use `cubic-bezier(0.23, 1, 0.32, 1)`.

## Steps

1. In `Documind-ai/src/styles.css`, replace the `.ai-progress-fill` declaration at line 388 with the target rule (`width: 100%`, `transform-origin: left center`, `transition: transform 180ms linear`). Keep it on one line if the surrounding rules are one line.
2. Replace `.diag-progress-fill` (line 867) with the target rule (`transition: transform 200ms linear`).
3. Replace `.token-progress-fill` (line 2678) with the target rule (`transition: transform 240ms linear`). Do not edit `.fill-ok`, `.fill-warning`, or `.fill-danger`.
4. Immediately after `.token-progress-fill`, add the `prefers-reduced-motion` block from Target. Do not put it inside the block at line 574.
5. In `AiAssistantView.jsx`, replace the fill's `style={{ width: ... }}` with the `scaleX` style from Target. Do not change the percent text node above it.
6. In `StorageHardwareModal.jsx`, replace the fill's `width` style with the `scaleX` style from Target. Keep `role="progressbar"` and `aria-valuenow={usagePercent}` on the track.
7. In `TokenGovernanceModal.jsx`, replace the fill's `width` style with `scaleX(${percentUsed / 100})`. Keep the className expression unchanged.

## Boundaries

- Do NOT touch `Documind-ai/src/landing.css`, `DocumentReader.jsx`, `ExcerptConsentModal.jsx`, `PageVisualPreview.jsx`, or `.visual-page-card`.
- Do NOT change track height, color, border, or copy.
- Do NOT add dependencies.
- Do NOT animate `width` on these three fills anymore.
- Do NOT set `scaleX` below `0` or above `1`.
- If a cited line no longer matches the current code, STOP and report. Do not improvise a different meter.

## Verification

- **Mechanical**: from `Documind-ai/`, run `npm test`. Expected: existing node tests pass. These files have no unit test for the inline style. Then search the repo for `transition: width` on `.ai-progress-fill`, `.diag-progress-fill`, and `.token-progress-fill`. Expected: no matches. Search the three JSX files for `style={{ width:` on those fills. Expected: no matches.
- **Feel check**: open the app, open Storage & hardware, and confirm the storage bar still grows from the left and still shows a sliver when usage is under 2%. Open Token governance and confirm the bar color still switches at 70% and 90%. In DevTools Animations, slow playback to 10% and confirm the bar scales on the compositor (the tracked property is `transform`, not `width`). In Rendering, enable `prefers-reduced-motion: reduce` and confirm the bar jumps to the new value with no slide.
- **Done when**: all three fills transition `transform` only, origins are `left center`, durations are 180ms / 200ms / 240ms, easing is `linear`, reduced motion sets `transition: none` after those rules, and the visible percent labels are unchanged.
