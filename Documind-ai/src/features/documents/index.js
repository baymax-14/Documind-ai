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
export {
  checkBackendHealth,
  uploadDocumentToBackend,
  listBackendDocuments,
  getBackendDocumentContent,
  reprocessBackendDocument,
  deleteBackendDocument,
  askBackendQuestion,
  resolveBackendCitation,
  compareBackendDocuments,
  exportBackendReport,
  summarizeBackendDocument,
  extractBackendStructuredData,
  listBackendConversations,
  getBackendConversation,
  API_BASE_URL,
} from './services/backendApi.js'
export { default as PrivacyNotice } from './components/PrivacyNotice.jsx'
export { default as DocumentReader } from './components/DocumentReader.jsx'
export { default as SearchResultsView } from './components/SearchResultsView.jsx'
export { default as ExcerptConsentModal } from './components/ExcerptConsentModal.jsx'
export { default as AiAssistantView } from './components/AiAssistantView.jsx'
export { default as StorageHardwareModal } from './components/StorageHardwareModal.jsx'
export { default as ComparisonView } from './components/ComparisonView.jsx'
export { default as DocumentWorkflowsModal } from './components/DocumentWorkflowsModal.jsx'
export { default as ProcessingStatusBadge } from './components/ProcessingStatusBadge.jsx'
export { default as ConversationHistoryModal } from './components/ConversationHistoryModal.jsx'
export {
  compareDocuments,
  findTopChunkForDoc,
  DEFAULT_COMPARISON_DIMENSIONS,
} from './services/comparison.js'
export {
  generateSectionSummary,
  exportSummaryToMarkdown,
  inferSectionTitle,
  extractTakeawaysFromText,
} from './services/summarize.js'
export {
  EXTRACTION_SCHEMAS,
  extractStructuredData,
  exportStructuredDataToJson,
} from './services/schemaExtract.js'
export {
  exportComparisonToMarkdown,
  exportAiChatToMarkdown,
  downloadMarkdownFile,
  copyToClipboard,
} from './services/export.js'
export {
  sanitizeQueryText,
  sanitizeDocumentText,
  sanitizeFilename,
  validateCitationIntegrity,
} from './services/security.js'
export { BENCHMARK_DATASET } from './data/benchmarkDataset.js'
export { runBenchmarkEvaluation } from './services/benchmark.js'
export { SEED_DOCS } from './data/seedDocs.js'
export { createConnectionManager } from './services/connectionManager.js'
export {
  getConversationDB,
  generateConversationTitle,
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  clearAllConversations,
} from './services/conversationStore.js'
export { createSyncManager } from './services/syncManager.js'
