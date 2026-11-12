export { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE, MAX_TEXT_LENGTH, FILE_ACCEPT, createDocRecord } from './types/document.js'
export { validateFile, partitionFiles } from './services/validate.js'
export { extractDocument } from './services/extract.js'
export {
  getDB,
  getAllDocuments,
  saveDocument,
  deleteDocument,
  clearAllDocuments,
  getStorageEstimate,
} from './services/storage.js'
export {
  searchDocuments,
  tokenizeQuery,
  extractSnippet,
} from './services/search.js'
export {
  retrieveEvidenceChunks,
  generateGroundedAnswer,
} from './services/aiChat.js'
export {
  checkWebGPUSupport,
  buildGroundedMessages,
  initializeOnDeviceEngine,
  generateAnswerWithFallback,
  DEFAULT_MODEL_ID,
  EVALUATED_MODELS,
} from './services/onDeviceModel.js'
export { useDocumentImport } from './hooks/useDocumentImport.js'
export { default as PrivacyNotice } from './components/PrivacyNotice.jsx'
export { default as DocumentReader } from './components/DocumentReader.jsx'
export { default as SearchResultsView } from './components/SearchResultsView.jsx'
export { default as ExcerptConsentModal } from './components/ExcerptConsentModal.jsx'
export { default as AiAssistantView } from './components/AiAssistantView.jsx'
export { SEED_DOCS } from './data/seedDocs.js'
