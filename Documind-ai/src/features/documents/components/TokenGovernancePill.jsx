import { Coins } from 'lucide-react'

/**
 * Token Governance & Operational Budget Status Pill.
 *
 * Placed in the topbar header beside the hardware status pill,
 * showing live session token consumption and opening the governance modal.
 *
 * @param {Object} props
 * @param {{
 *   totalTokens: number,
 *   budget: number,
 *   usageRatio: number,
 *   isExceeded: boolean
 * }} props.metrics
 * @param {() => void} props.onClick
 */
export default function TokenGovernancePill({ metrics, onClick }) {
  const total = metrics?.totalTokens || 0
  const budget = metrics?.budget || 100000
  const ratio = metrics?.usageRatio || (total / budget)

  const formattedTotal = total > 1000 ? `${(total / 1000).toFixed(1)}k` : `${total}`
  const formattedBudget = budget >= 1000 ? `${Math.round(budget / 1000)}k` : `${budget}`

  const indicatorClass =
    ratio > 0.9 ? 'indicator-red' : ratio > 0.7 ? 'indicator-yellow' : 'indicator-green'

  return (
    <button
      type="button"
      className="hardware-status-pill token-governance-pill"
      onClick={onClick}
      title={`Token budget: ${total.toLocaleString()} / ${budget.toLocaleString()} tokens estimated. Click to inspect governance.`}
      aria-label="Inspect Token Governance & Audit"
    >
      <Coins size={14} aria-hidden="true" />
      <span>{formattedTotal} / {formattedBudget} tokens</span>
      <span className={`status-indicator ${indicatorClass}`} />
    </button>
  )
}
