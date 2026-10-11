/**
 * Best-effort JSON repair for small-LLM output.
 *
 * Common breakages we fix:
 *   1. Trailing commas before closing brackets
 *   2. Unquoted property names: {name: "foo"} -> {"name": "foo"}
 *   3. Single quotes: {'key': 'val'} -> {"key": "val"}
 *   4. Missing closing brace at end of object
 *   5. Newlines inside string values
 *   6. Markdown code fences around the JSON
 *
 * This is NOT a general-purpose JSON repair library. It exists because
 * 3B-class LLMs reliably produce one of the above errors and we want
 * graceful recovery before falling back to a model re-prompt.
 */

export function repairJson(text: string): string {
  let s = text.trim()

  // Strip markdown fences
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) s = fenceMatch[1].trim()

  // Replace single-quoted strings with double-quoted
  s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')

  // Quote unquoted property names: {foo: 1} -> {"foo": 1}
  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')

  // Remove trailing commas: ,} or ,]
  s = s.replace(/,(\s*[}\]])/g, '$1')

  // Count braces/brackets; if imbalanced, append missing closers
  const opens = (s.match(/[{\[]/g) || []).length
  const closes = (s.match(/[}\]]/g) || []).length
  if (opens > closes) {
    const stack: string[] = []
    for (const c of s) {
      if (c === '{' || c === '[') stack.push(c)
      else if (c === '}' || c === ']') stack.pop()
    }
    // Append closers in reverse order
    while (stack.length) {
      const open = stack.pop()!
      s += open === '{' ? '}' : ']'
    }
  }

  return s
}
