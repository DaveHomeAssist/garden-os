import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";
import assert from "node:assert/strict";

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

const context = createContext({
  console,
  Date,
  Math,
  JSON,
  localStorage: createLocalStorage(),
});
context.window = context;
context.self = context;

new Script(readFileSync(new URL("gos-journal.js", repo), "utf8"), {
  filename: "gos-journal.js",
}).runInContext(context);

const { GardenJournal } = context;

const drafts = [
  {
    id: "sys-frost",
    type: "system",
    source: "system",
    title: "Frost risk",
    eventDate: "2026-04-27",
    createdAt: "2026-04-27T09:00:00.000Z",
    updatedAt: "2026-04-27T09:00:00.000Z",
    bedId: "raised_bed_right",
    bedName: "Raised Bed Right",
    severity: "urgent",
    dismissedAt: "2026-04-27T10:00:00.000Z",
  },
  {
    id: "manual-note",
    type: "note",
    source: "manual",
    title: "Watered",
    eventDate: "2026-04-26",
    createdAt: "2026-04-26T15:00:00.000Z",
    updatedAt: "2026-04-26T15:00:00.000Z",
    bedId: "raised_bed_left",
    bedName: "Raised Bed Left",
    severity: "info",
  },
  {
    id: "planner-harvest",
    type: "harvest",
    source: "planner",
    title: "Picked lettuce",
    eventDate: "2026-04-25",
    createdAt: "2026-04-25T12:00:00.000Z",
    updatedAt: "2026-04-25T12:00:00.000Z",
    bedId: "grow_bags",
    bedName: "Grow Bags",
    cropId: "head_lettuce",
    severity: "success",
  },
  {
    id: "manual-maintenance",
    type: "maintenance",
    source: "manual",
    title: "Added compost",
    eventDate: "2026-04-24",
    createdAt: "2026-04-24T08:00:00.000Z",
    updatedAt: "2026-04-24T08:00:00.000Z",
    bedId: "raised_bed_right",
    bedName: "Raised Bed Right",
    severity: "warning",
  },
  {
    id: "deleted-old",
    type: "note",
    source: "manual",
    title: "Deleted note",
    eventDate: "2026-04-23",
    createdAt: "2026-04-23T08:00:00.000Z",
    updatedAt: "2026-04-23T08:00:00.000Z",
    deletedAt: "2026-04-23T09:00:00.000Z",
  },
];

for (const draft of drafts) GardenJournal.append(draft);

assert.deepEqual(
  GardenJournal.readAll().map((entry) => entry.id),
  ["sys-frost", "manual-note", "planner-harvest", "manual-maintenance", "deleted-old"],
  "readAll should default to newest first and keep deleted entries last",
);

assert.deepEqual(
  GardenJournal.query({ sort: "oldest" }).map((entry) => entry.id),
  ["manual-maintenance", "planner-harvest", "manual-note"],
  "oldest sort should keep dismissed systems hidden by default and exclude deleted entries",
);

assert.deepEqual(
  GardenJournal.query({ sort: "type", hideDismissedSystem: false }).map((entry) => entry.id),
  ["planner-harvest", "manual-maintenance", "manual-note", "sys-frost"],
  "type sort should group by type with newest fallback inside each group",
);

assert.deepEqual(
  GardenJournal.query({ sort: "source", hideDismissedSystem: false }).map((entry) => entry.id),
  ["manual-note", "manual-maintenance", "planner-harvest", "sys-frost"],
  "source sort should group manual, planner, and system entries",
);

assert.deepEqual(
  GardenJournal.query({ sort: "bed", hideDismissedSystem: false }).map((entry) => entry.id),
  ["planner-harvest", "manual-note", "sys-frost", "manual-maintenance"],
  "bed sort should group by bed name with newest fallback inside a bed",
);

assert.deepEqual(
  GardenJournal.query({ source: "manual", severity: "warning", sort: "newest" }).map((entry) => entry.id),
  ["manual-maintenance"],
  "source and severity filters should combine",
);

assert.deepEqual(
  GardenJournal.query({ type: "system" }).map((entry) => entry.id),
  [],
  "dismissed system entries should be hidden by default",
);

assert.deepEqual(
  GardenJournal.query({ type: "system", hideDismissedSystem: false }).map((entry) => entry.id),
  ["sys-frost"],
  "dismissed system entries should return when requested",
);

assert.deepEqual(
  GardenJournal.query({ showDeleted: true, sort: "newest" }).map((entry) => entry.id).slice(-1),
  ["deleted-old"],
  "deleted entries should stay last even when included",
);

const journal = readFileSync(new URL("journal.html", repo), "utf8");
for (const expected of [
  "UI_PREFS_KEY",
  "LAST_MANUAL_DEFAULTS_KEY",
  "QUICK_ACTIONS_KEY",
  "LAST_CONTEXT_KEY",
  "resolveInitialState",
  "presetState",
  "applyPreset",
  "quickActionDefs",
  "renderQuickStrip",
  "applyManualDefaults",
  "Date.now() - updated > 30",
  "writeDismissedMomSystemIds(pruned)",
  "severityLabels",
  "sortLabels",
  "sortTimelineEntries",
  "makeGroup('view'",
  "makeGroup('severity'",
  "makeGroup('sort'",
]) {
  assert.match(journal, new RegExp(expected.replace(/[()']/g, "\\$&")), `Journal UI should include ${expected}`);
}

console.log(JSON.stringify({ ok: true, scenarios: 21 }, null, 2));
