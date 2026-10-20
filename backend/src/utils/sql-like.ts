/**
 * Escapes MySQL LIKE wildcards (backslash, percent, underscore) so user input
 * is matched literally instead of as a pattern. Relies on MySQL's default
 * LIKE escape character, which is a backslash.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
