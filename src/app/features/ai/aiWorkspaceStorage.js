const KEY = "jobos.ai_workspace.v1";
const MAX_ITEMS = 100;

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadAiWorkspaceItems() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value.filter((item) => Boolean(
      item && typeof item === "object"
      && typeof item.id === "string" && item.id.trim()
      && typeof item.kind === "string" && item.kind.trim()
      && typeof item.text === "string" && item.text.trim()
      && typeof item.createdAt === "string" && item.createdAt.trim(),
    )).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveAiWorkspaceItem(item) {
  const storage = getStorage();
  if (!storage) return;
  try {
    const next = [item, ...loadAiWorkspaceItems().filter((current) => current.id !== item.id)].slice(0, MAX_ITEMS);
    storage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Browser storage can be unavailable or quota-limited.
  }
}

export function clearAiWorkspaceItems() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    // Browser storage can be unavailable.
  }
}
