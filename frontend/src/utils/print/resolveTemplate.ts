import Mustache from 'mustache'

/**
 * Resolve a Mustache template using a plain object context.
 *
 * Notes:
 * - We intentionally do NOT execute arbitrary JS (no eval).
 * - Missing keys become empty string by default in Mustache.
 */
export function resolveTemplate(template: string, ctx: Record<string, any>): string {
  if (!template) return ''
  return Mustache.render(String(template), ctx ?? {})
}





