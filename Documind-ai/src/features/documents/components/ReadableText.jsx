/**
 * Shows extracted passage text the way it reads in the source: markdown
 * headings as headings, pipe tables as tables, **bold** as bold, and the rest
 * as paragraphs. The passage text itself is never changed, so citations and
 * offsets still point at the same characters.
 */

import { parseReadableBlocks } from '../services/readableBlocks.js'

/** Render `**bold**` spans; everything else goes through `renderText`. */
function Inline({ text, renderText }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{renderText(part.slice(2, -2))}</strong>
    }
    return <span key={i}>{renderText(part)}</span>
  })
}

const plain = (t) => t

/**
 * @param {Object} props
 * @param {string} props.text - Passage text.
 * @param {(text: string) => import('react').ReactNode} [props.renderText] - e.g. search highlighting.
 * @param {string} [props.className]
 */
export default function ReadableText({ text, renderText = plain, className = '' }) {
  const blocks = parseReadableBlocks(text)
  return (
    <div className={`readable-text ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="readable-heading">
              <Inline text={block.text} renderText={renderText} />
            </p>
          )
        }
        if (block.type === 'table') {
          const [head, ...body] = block.hasHeader ? block.rows : [null, ...block.rows]
          return (
            <div key={i} className="readable-table-wrap">
              <table className="readable-table">
                {head && (
                  <thead>
                    <tr>
                      {head.map((cell, c) => (
                        <th key={c} scope="col">{renderText(cell)}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c}>{renderText(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return (
          <p key={i} className="readable-paragraph">
            <Inline text={block.text} renderText={renderText} />
          </p>
        )
      })}
    </div>
  )
}
