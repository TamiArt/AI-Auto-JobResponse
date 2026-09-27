import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAiWorkspaceItems,
  loadAiWorkspaceItems,
  saveAiWorkspaceItem,
} from "../src/app/features/ai/aiWorkspaceStorage.ts";

function createStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

test("AI Workspace persists imported responses and reloads them", () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = createStorage();
  try {
    clearAiWorkspaceItems();
    saveAiWorkspaceItem({ id: "1", kind: "cover-letter", text: "Ответ", createdAt: "2026-09-27T10:00:00Z" });
    assert.deepEqual(loadAiWorkspaceItems(), [
      { id: "1", kind: "cover-letter", text: "Ответ", createdAt: "2026-09-27T10:00:00Z" },
    ]);
  } finally {
    globalThis.localStorage = previous;
  }
});

test("AI Workspace rejects malformed persisted records", () => {
  const storage = createStorage();
  storage.setItem("jobos.ai_workspace.v1", JSON.stringify([
    { id: "ok", kind: "other", text: "saved", createdAt: "2026-09-27T10:00:00Z" },
    { id: "", kind: "other", text: "bad", createdAt: "2026-09-27T10:00:00Z" },
    { id: "bad", kind: "other", text: "", createdAt: "2026-09-27T10:00:00Z" },
  ]));
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    assert.deepEqual(loadAiWorkspaceItems(), [
      { id: "ok", kind: "other", text: "saved", createdAt: "2026-09-27T10:00:00Z" },
    ]);
  } finally {
    globalThis.localStorage = previous;
  }
});
