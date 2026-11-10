import { FileText } from 'lucide-react'

function Brand({ className = '', markClassName = '', wordmarkClassName = '', children }) {
  return <span className={className}>
    <span className={markClassName} aria-hidden="true"><FileText size={20} strokeWidth={2.5} /></span>
    <span className={wordmarkClassName}>{children || <>DocuMind<span className="brand-ai"> AI</span></>}</span>
  </span>
}

export default Brand
