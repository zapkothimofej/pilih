import { describe, it, expect } from 'vitest'
import { stripCodeFences } from '../../lib/ai/llm'

describe('stripCodeFences', () => {
  it('passes through plain JSON', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}')
  })

  it('strips a leading ```json fence and trailing fence', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('strips ``` with no language hint', () => {
    expect(stripCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('does NOT eat triple-backticks inside string values (trailing-only anchor)', () => {
    // The greedy regex used to devour everything from the first inner
    // fence to the end. The tightened /\s*```\s*$/ anchor now only
    // strips a genuinely trailing fence.
    const input = '```json\n{"text":"use ```bash\\nls\\n``` carefully"}\n```'
    const out = stripCodeFences(input)
    expect(out).toContain('use ```bash')
    expect(out).toContain('carefully')
    expect(out.endsWith('}')).toBe(true)
  })

  it('handles trailing whitespace after the closing fence', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```  \n\n')).toBe('{"a":1}')
  })
})
