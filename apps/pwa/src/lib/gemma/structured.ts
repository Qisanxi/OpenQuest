/**
 * Structured-output helper: extract JSON from a model completion,
 * validate against a Zod schema, and run one text-only repair pass
 * if the first attempt failed.
 *
 * Why this matters: small LLMs (Gemma 3B-class) are notoriously bad at
 * producing clean JSON. The trick is:
 *   1. Wrap the prompt with explicit "output JSON only" instructions
 *   2. Strip any prose before/after the JSON object
 *   3. Try to parse — if it fails, send the broken output back to the
 *      model with "your previous output was invalid JSON, fix it"
 *   4. Validate against Zod — type-safe at the boundary
 *   5. If still invalid, return null. NEVER throw — a bad generation
 *      should not break the game.
 */

import { z, type ZodType } from 'zod'
import { gemmaClient, type ChatMessage } from './client.js'
import { repairJson } from '../ai/jsonRepair.js'

export interface StructuredOptions {
  /** When true, attempt one repair pass on parse failure. Default true. */
  repair?: boolean
  /** Max attempts (initial + repairs). Default 2. */
  maxAttempts?: number
}

export async function generateStructured<T>(
  schema: ZodType<T>,
  messages: ChatMessage[],
  options: StructuredOptions = {},
): Promise<T | null> {
  const { repair = true, maxAttempts = 2 } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let text = ''
    for await (const token of gemmaClient.generate(messages)) {
      text += token
    }

    const jsonText = extractJson(text)
    if (!jsonText) continue

    try {
      const parsed = JSON.parse(jsonText)
      const result = schema.safeParse(parsed)
      if (result.success) return result.data
    } catch {
      // try repair
    }

    if (repair && attempt < maxAttempts - 1) {
      messages = [
        ...messages,
        { role: 'assistant', content: text },
        {
          role: 'user',
          content:
            'Your previous output was not valid JSON or did not match the schema. ' +
            'Output only the JSON object, no prose, no markdown fences.',
        },
      ]
    }
  }

  return null
}

/**
 * Extract the first {...} or [...] JSON block from arbitrary text.
 * Strips markdown fences if present.
 */
function extractJson(text: string): string | null {
  // Strip ```json ... ``` fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()

  // Try to find the first {...} block
  const start = text.indexOf('{')
  if (start === -1) {
    const arrStart = text.indexOf('[')
    if (arrStart === -1) return null
    const arrEnd = text.lastIndexOf(']')
    return arrEnd > arrStart ? text.slice(arrStart, arrEnd + 1) : null
  }
  const end = text.lastIndexOf('}')
  return end > start ? text.slice(start, end + 1) : null
}

/**
 * Lightweight attempt to fix common JSON breakage: trailing commas,
 * unquoted keys, missing closing braces.
 */
export function tryRepairJson(text: string): string {
  return repairJson(text)
}
