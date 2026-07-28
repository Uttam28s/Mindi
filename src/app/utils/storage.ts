/**
 * Small localStorage wrapper.
 *
 * Used for player name and tour-completion persistence. The try/catch matters:
 * localStorage throws in private-mode Safari and in sandboxed iframes.
 */

export function saveData(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / sandboxed iframe) — ignore */
  }
}

export function loadData(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function removeData(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
