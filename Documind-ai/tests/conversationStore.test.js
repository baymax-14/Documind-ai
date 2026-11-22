import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateConversationTitle } from '../src/features/documents/services/conversationStore.js'

// Note: Full IndexedDB CRUD tests require a browser or polyfill.
// We test the pure functions and data contract here.

describe('Conversation Store — Pure Functions (Phase 10)', () => {
  it('generates title from first user message', () => {
    const messages = [
      { sender: 'user', text: 'What percentage of teams use data retention policies?', timestamp: 1 },
      { sender: 'assistant', text: 'According to...', timestamp: 2 },
    ]

    const title = generateConversationTitle(messages)
    assert.equal(title, 'What percentage of teams use data retention policies?')
  })

  it('truncates long titles to 60 chars with ellipsis', () => {
    const longQuestion = 'This is a very long question that exceeds the sixty character limit for conversation titles and should be truncated'
    const messages = [
      { sender: 'user', text: longQuestion, timestamp: 1 },
    ]

    const title = generateConversationTitle(messages)
    assert.ok(title.length <= 60, `Title should be <= 60 chars, got ${title.length}`)
    assert.ok(title.endsWith('…'), 'Truncated title should end with ellipsis')
  })

  it('returns default title when no user messages exist', () => {
    const messages = [
      { sender: 'assistant', text: 'Welcome!', timestamp: 1 },
    ]

    const title = generateConversationTitle(messages)
    assert.equal(title, 'Untitled conversation')
  })

  it('returns default title for empty messages array', () => {
    const title = generateConversationTitle([])
    assert.equal(title, 'Untitled conversation')
  })

  it('handles user message with empty text', () => {
    const messages = [
      { sender: 'user', text: '', timestamp: 1 },
    ]

    const title = generateConversationTitle(messages)
    assert.equal(title, 'Untitled conversation')
  })

  it('preserves short titles without truncation', () => {
    const messages = [
      { sender: 'user', text: 'Market growth rate?', timestamp: 1 },
    ]

    const title = generateConversationTitle(messages)
    assert.equal(title, 'Market growth rate?')
    assert.ok(!title.includes('…'), 'Short title should not have ellipsis')
  })

  it('uses first user message even when assistant messages precede it', () => {
    const messages = [
      { sender: 'assistant', text: 'System initialized', timestamp: 1 },
      { sender: 'assistant', text: 'Ready for questions', timestamp: 2 },
      { sender: 'user', text: 'What is the Q3 expansion rate?', timestamp: 3 },
    ]

    const title = generateConversationTitle(messages)
    assert.equal(title, 'What is the Q3 expansion rate?')
  })
})
