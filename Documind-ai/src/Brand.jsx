/**
 * The DocuMind mark: a page with a clipped corner, two lines of text, and one
 * red line, the citation, pulled out past the edge of the page.
 *
 * Drawn on a 32-unit grid with square joins. Ink follows `currentColor`, so the
 * mark inverts with its surface; the cited line is always the signal red.
 * public/favicon.svg and scripts/make-icons.py draw the same geometry.
 */
export function BrandMark({ size = 24, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 2.5H19.5L26.5 9.5V29.5H5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="miter"
      />
      <rect x="9.5" y="13" width="10" height="2.5" fill="currentColor" />
      {/* Set through CSS, not the fill attribute: var() in SVG attributes is not reliable across browsers */}
      <rect x="9.5" y="17.75" width="21" height="3.25" style={{ fill: 'var(--red, #d3110f)' }} />
      <rect x="9.5" y="23.5" width="7" height="2.5" fill="currentColor" />
    </svg>
  )
}

function Brand({ className = '', markClassName = '', wordmarkClassName = '', markSize = 24, children }) {
  return <span className={className}>
    <span className={markClassName} aria-hidden="true"><BrandMark size={markSize} /></span>
    <span className={wordmarkClassName}>{children || <>DocuMind<span className="brand-ai"> AI</span></>}</span>
  </span>
}

export default Brand
