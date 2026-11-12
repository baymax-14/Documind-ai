import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from '../types/document.js'

/**
 * Validate a File object before extraction.
 *
 * Returns { valid: true } or { valid: false, reason: string }.
 *
 * @param {File} file
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateFile(file) {
  if (!file || !file.name) {
    return { valid: false, reason: 'No file provided.' }
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) {
    const supported = Array.from(SUPPORTED_EXTENSIONS).map((e) => `.${e.toUpperCase()}`).join(', ')
    return {
      valid: false,
      reason: `Unsupported file type ".${extension || '?'}". Supported formats: ${supported}.`,
    }
  }

  if (file.size === 0) {
    return { valid: false, reason: `${file.name} is empty (0 bytes).` }
  }

  if (file.size > MAX_FILE_SIZE) {
    const limitMB = Math.round(MAX_FILE_SIZE / (1024 * 1024))
    const fileMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      reason: `${file.name} is ${fileMB} MB, which exceeds the ${limitMB} MB limit.`,
    }
  }

  return { valid: true }
}

/**
 * Partition an array of Files into valid and rejected groups.
 *
 * @param {File[]} files
 * @returns {{ valid: File[], rejected: { file: File, reason: string }[] }}
 */
export function partitionFiles(files) {
  const valid = []
  const rejected = []

  for (const file of files) {
    const result = validateFile(file)
    if (result.valid) {
      valid.push(file)
    } else {
      rejected.push({ file, reason: result.reason })
    }
  }

  return { valid, rejected }
}

