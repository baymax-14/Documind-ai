import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXTRACTION_SCHEMAS,
  extractStructuredData,
  exportStructuredDataToJson,
} from '../src/features/documents/services/schemaExtract.js'
import { SEED_DOCS } from '../src/features/documents/data/seedDocs.js'

describe('Structured Schema-Based Extraction Service', () => {
  it('extracts structured research paper schema with verifiable claim locators', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-2') // Product Strategy 2025.docx
    assert.ok(doc)

    const result = extractStructuredData({
      document: doc,
      schemaId: 'RESEARCH_PAPER',
    })

    assert.equal(result.documentId, 'demo-2')
    assert.equal(result.schemaName, 'Research Paper Schema')
    assert.equal(result.fields.length, EXTRACTION_SCHEMAS.RESEARCH_PAPER.fields.length)

    // Check objective field
    const objectiveField = result.fields.find((f) => f.key === 'objective')
    assert.ok(objectiveField)
    assert.equal(objectiveField.hasEvidence, true)
    assert.match(objectiveField.value, /DocuMind AI|thesis|evidence/i)
    assert.ok(objectiveField.locator)
    assert.equal(typeof objectiveField.chunkIndex, 'number')

    // Check methodology field
    const methodField = result.fields.find((f) => f.key === 'methodology')
    assert.ok(methodField)
    assert.equal(methodField.hasEvidence, true)
    assert.match(methodField.value, /Web Workers|WebAssembly|IndexedDB/i)
  })

  it('strictly sets value to null when no supporting evidence exists in document', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-2')

    // Run extraction with custom nonexistent field
    const result = extractStructuredData({
      document: doc,
      customFields: [
        {
          key: 'orbital_mechanics',
          label: 'Orbital Mechanics & Thrust',
          query: 'orbital velocity spacecraft propulsion thrust trajectory gravitation',
        },
      ],
    })

    const orbitalField = result.fields[0]
    assert.equal(orbitalField.hasEvidence, false)
    assert.equal(orbitalField.value, null)
    assert.equal(orbitalField.chunkIndex, null)
    assert.equal(orbitalField.confidence, 'none')
    assert.match(orbitalField.excerpt, /No supporting evidence located/i)
  })

  it('extracts market analysis schema and exports formatted JSON', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-1') // Q3 Market Research.pdf
    assert.ok(doc)

    const result = extractStructuredData({
      document: doc,
      schemaId: 'MARKET_ANALYSIS',
    })

    const metricsField = result.fields.find((f) => f.key === 'growth_metrics')
    assert.ok(metricsField)
    assert.equal(metricsField.hasEvidence, true)
    assert.match(metricsField.value, /24%|expansion|growth/i)

    const jsonStr = exportStructuredDataToJson(result)
    assert.equal(typeof jsonStr, 'string')
    const parsed = JSON.parse(jsonStr)
    assert.equal(parsed.documentName, 'Q3 Market Research.pdf')
    assert.equal(parsed.fields.length, EXTRACTION_SCHEMAS.MARKET_ANALYSIS.fields.length)
  })

  it('extracts brand & product design schema with valid evidence fields', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-2') // Product Strategy 2025.docx
    assert.ok(doc)

    const result = extractStructuredData({
      document: doc,
      schemaId: 'PRODUCT_DESIGN',
    })

    assert.equal(result.schemaName, 'Brand & Product Guidelines Schema')
    assert.equal(result.fields.length, EXTRACTION_SCHEMAS.PRODUCT_DESIGN.fields.length)
    const visionField = result.fields.find((f) => f.key === 'vision_principles')
    assert.ok(visionField)
    assert.equal(visionField.hasEvidence, true)
    assert.match(visionField.value, /DocuMind AI|thesis|evidence/i)
  })
})
