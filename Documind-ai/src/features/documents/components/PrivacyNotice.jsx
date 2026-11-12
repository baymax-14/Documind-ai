import { Info, Shield } from 'lucide-react'

/**
 * Privacy notice shown before first file import.
 * Explains what "local processing" means and what happens to file data.
 *
 * @param {{ onAccept: () => void }} props
 */
function PrivacyNotice({ onAccept }) {
  return (
    <div className="privacy-notice" role="region" aria-label="Privacy and data handling notice">
      <div className="privacy-header">
        <span className="privacy-icon"><Shield size={20} aria-hidden="true" /></span>
        <h2>Before you add documents</h2>
      </div>
      <div className="privacy-body">
        <ul className="privacy-points">
          <li>
            <Info size={15} aria-hidden="true" />
            <span>Chosen files are <strong>read in this browser</strong>. No file bytes or extracted text leave your device.</span>
          </li>
          <li>
            <Info size={15} aria-hidden="true" />
            <span>Files are staged in memory until you choose <strong>Add to local library</strong> to save them in your browser's IndexedDB.</span>
          </li>
          <li>
            <Info size={15} aria-hidden="true" />
            <span>Saved documents persist across reloads. You can <strong>delete individual documents or clear your library</strong> at any time.</span>
          </li>
        </ul>
        <p className="privacy-note">
          This is a local-first workspace. Cloud sync, server backends, and AI analysis are not connected.
        </p>
      </div>
      <button className="primary-button privacy-accept" onClick={onAccept}>
        I understand, let me add files
      </button>
    </div>
  )
}

export default PrivacyNotice

