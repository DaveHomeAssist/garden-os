import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Script, createContext } from "node:vm";

const repo = new URL("../", import.meta.url);

function createLocalStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function loadGosBed(fetchImpl = async () => ({ ok: true, json: async () => ({ ok: true }) })) {
  const localStorage = createLocalStorage();
  const context = createContext({
    console,
    Date,
    Error,
    JSON,
    Math,
    RegExp,
    URL,
    fetch: fetchImpl,
    crypto: {
      randomUUID: () => "test-tab-id",
    },
    localStorage,
  });
  context.window = context;
  context.self = context;

  new Script(readFileSync(new URL("gos-bed.js", repo), "utf8"), { filename: "gos-bed.js" }).runInContext(context);
  return { GosBed: context.GosBed, localStorage };
}

test("sync default worker URL rejects non-local HTTP", () => {
  const { GosBed, localStorage } = loadGosBed();

  assert.equal(GosBed.sync.setDefaultWorkerUrl("http://sync.example.test"), false);
  assert.equal(localStorage.getItem("gos.sync.workerUrl"), null);
});

test("sync default worker URL allows HTTPS and localhost HTTP", () => {
  const { GosBed, localStorage } = loadGosBed();

  assert.equal(GosBed.sync.setDefaultWorkerUrl("https://sync.example.test///"), true);
  assert.equal(localStorage.getItem("gos.sync.workerUrl"), "https://sync.example.test");

  assert.equal(GosBed.sync.setDefaultWorkerUrl("http://localhost:8787///"), true);
  assert.equal(localStorage.getItem("gos.sync.workerUrl"), "http://localhost:8787");

  assert.equal(GosBed.sync.setDefaultWorkerUrl("http://127.0.0.1:8787///"), true);
  assert.equal(localStorage.getItem("gos.sync.workerUrl"), "http://127.0.0.1:8787");
});

test("sync create rejects non-local HTTP before fetch", async () => {
  let fetchCalled = false;
  const { GosBed } = loadGosBed(async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({ ok: true, code: "TEST-AAAA", secret: "secret" }) };
  });

  GosBed.write({
    id: "bed-1",
    name: "Bed 1",
    shape: "4x4",
    sun: "full",
    painted: [],
    events: [],
  });

  await assert.rejects(
    () => GosBed.sync.create("bed-1", "http://sync.example.test"),
    /Worker URL must use HTTPS/,
  );
  assert.equal(fetchCalled, false);
  assert.equal(GosBed.sync.getCode("bed-1"), null);
});

test("sync import rejects remote bed with unsafe id before localStorage write", async () => {
  const { GosBed, localStorage } = loadGosBed(async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        id: "../bad-bed",
        name: "Bad Bed",
        shape: "4x4",
        sun: "full",
        painted: [],
        events: [],
      },
    }),
  }));

  await assert.rejects(
    () => GosBed.sync.importFromCode("TEST-AAAA", "https://sync.example.test"),
    /invalid bed payload/,
  );
  assert.equal(localStorage.getItem("gos.bed.../bad-bed"), null);
  assert.equal(GosBed.read("../bad-bed"), null);
});

test("sync import rejects remote bed with unsafe text fields", async () => {
  const { GosBed } = loadGosBed(async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        id: "remote-bed",
        name: "<img src=x onerror=alert(1)>",
        shape: "4x4",
        sun: "full",
        painted: [],
        events: [],
      },
    }),
  }));

  await assert.rejects(
    () => GosBed.sync.importFromCode("TEST-AAAA", "https://sync.example.test"),
    /invalid bed payload/,
  );
  assert.equal(GosBed.read("remote-bed"), null);
});

test("sync import rejects remote bed with out-of-bounds painted cell", async () => {
  const { GosBed } = loadGosBed(async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        id: "remote-bed",
        name: "Remote Bed",
        shape: "4x4",
        sun: "full",
        painted: [{ cell: "r9c9", cropId: "tomato", cropName: "Tomato" }],
        events: [],
      },
    }),
  }));

  await assert.rejects(
    () => GosBed.sync.importFromCode("TEST-AAAA", "https://sync.example.test"),
    /invalid bed payload/,
  );
  assert.equal(GosBed.read("remote-bed"), null);
});

test("sync import accepts valid remote bed payload", async () => {
  const { GosBed } = loadGosBed(async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        id: "remote-bed",
        name: "Remote Bed",
        shape: "4x4",
        sun: "full",
        painted: [{ cell: "r1c2", cropId: "tomato", cropName: "Tomato", plantedWeek: 16 }],
        events: [{ type: "mark_done", bedId: "remote-bed", cell: "r1c2", timestamp: "2026-04-27T12:00:00.000Z" }],
      },
    }),
  }));

  const imported = await GosBed.sync.importFromCode("TEST-AAAA", "https://sync.example.test");

  assert.equal(imported.id, "remote-bed");
  assert.equal(GosBed.read("remote-bed").painted[0].cell, "r1c2");
});
