import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { Script, createContext } from "node:vm";
import assert from "node:assert/strict";

const repo = new URL("../", import.meta.url);
const momDataUrl = new URL("data/mom-garden-data.json", repo);

assert.equal(existsSync(momDataUrl), true, "data/mom-garden-data.json should exist");

const momData = JSON.parse(readFileSync(momDataUrl, "utf8"));
const plantings = momData.beds.flatMap((bed) => bed.plantings.map((planting) => ({ bed, planting })));

assert.equal(momData.version, 1, "Mom data version should be 1");
assert.equal(momData.beds.length, 3, "Mom data should define 3 beds");
assert.equal(plantings.length, 13, "Mom data should define 13 plantings");
assert.deepEqual(
  momData.beds.map((bed) => [bed.id, bed.dimensions.rows, bed.dimensions.cols]),
  [
    ["raised_bed_left", 4, 4],
    ["raised_bed_right", 4, 4],
    ["grow_bags", 1, 6],
  ],
  "Mom bed dimensions should preserve the source layout",
);
assert.equal(
  new Set(plantings.map(({ planting }) => planting.cropId)).size,
  7,
  "Mom data should contain 7 distinct crop IDs",
);
assert.equal(
  plantings.filter(({ planting }) => planting.varietyName).length,
  8,
  "Mom data should preserve all variety names",
);

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

const localStorage = createLocalStorage();
const context = createContext({
  console,
  Date,
  Math,
  JSON,
  crypto: {
    randomUUID: () => "test-tab-id",
  },
  localStorage,
});
context.window = context;
context.self = context;

new Script(readFileSync(new URL("gos-bed.js", repo), "utf8"), { filename: "gos-bed.js" }).runInContext(context);

assert.equal(typeof context.GosBed.mom.buildBedsFromData, "function", "GosBed.mom.buildBedsFromData should exist");
assert.equal(typeof context.GosBed.mom.loadFromData, "function", "GosBed.mom.loadFromData should exist");
assert.equal(typeof context.GosBed.mom.isLoaded, "function", "GosBed.mom.isLoaded should exist");

const builtBeds = context.GosBed.mom.buildBedsFromData(momData, { loadedAt: "2026-04-27T12:00:00.000Z" });
assert.equal(builtBeds.length, 3, "Mom loader should build 3 GosBed records");
assert.equal(
  builtBeds.reduce((sum, bed) => sum + bed.painted.length, 0),
  13,
  "Mom loader should place all 13 plantings",
);

const growBags = builtBeds.find((bed) => bed.id === "grow_bags");
assert.equal(growBags.shape, "6x1", "Grow bags should be a 1x6 virtual bed");
assert.equal(
  JSON.stringify(growBags.painted.map((p) => p.cell)),
  JSON.stringify(["r0c0", "r0c1", "r0c2", "r0c3", "r0c4", "r0c5"]),
  "Grow bag plantings should map Bag 1 through Bag 6 left-to-right",
);

const snapPea = builtBeds
  .find((bed) => bed.id === "raised_bed_right")
  .painted.find((p) => p.id === "mom_pea_snap_cascadia_right");
assert.equal(snapPea.cropId, "peas");
assert.equal(snapPea.displayName, "Pea, Snap");
assert.equal(snapPea.varietyName, "Cascadia");
assert.equal(snapPea.status, "Sprouted");
assert.equal(snapPea.placementConfidence, "row");

const loadResult = context.GosBed.mom.loadFromData(momData, {
  loadedAt: "2026-04-27T12:00:00.000Z",
  overwrite: true,
});
assert.equal(loadResult.beds.length, 3, "Loading Mom data should write 3 beds");
assert.equal(loadResult.plantingCount, 13, "Loading Mom data should report 13 plantings");
assert.equal(context.GosBed.readAll().length, 3, "GosBed.readAll should return Mom beds after load");
assert.equal(context.GosBed.mom.isLoaded(), true, "GosBed.mom.isLoaded should detect loaded Mom beds");

const loadedLeft = context.GosBed.read("raised_bed_left");
assert.equal(loadedLeft.source, "mom-garden-data.json v1");
assert.equal(loadedLeft.loadedAt, "2026-04-27T12:00:00.000Z");
assert.equal(loadedLeft.painted.find((p) => p.varietyName === "Wando").cropId, "peas");
assert.equal(loadedLeft.painted.find((p) => p.varietyName === "Marvel of Four Seasons").cropId, "red_lettuce");
assert.equal(
  loadedLeft.events.filter((event) => event.type === "journal").length,
  5,
  "Raised Bed Left should include one load journal event plus one event per planting",
);

const planner = readFileSync(new URL("garden-planner-v5.html", repo), "utf8");
for (const cropId of ["peas", "scallion", "garlic", "head_lettuce", "red_lettuce", "kale", "carrot"]) {
  assert.match(planner, new RegExp(`${cropId}:\\s*\\{`), `Planner fallback CROPS should include ${cropId}`);
}
assert.match(planner, /mono:'Ps'/, "Peas should use Ps mono label to avoid Pepper's Pe collision");
assert.match(planner, /fall planting/, "Planner should mention garlic's fall planting cycle");
assert.match(planner, /Ask Doctor/, "Planner should link crop context to Doctor");

const painting = readFileSync(new URL("garden-painting.html", repo), "utf8");
assert.match(painting, /Load Mom Garden/, "Beds page should surface Load Mom Garden");
assert.match(painting, /Reset to Mom Garden/, "Beds page should surface Reset to Mom Garden");
assert.match(painting, /Bag '\s*\+\s*\(cell\.c \+ 1\)/, "Beds page should render grow bag labels");

const hub = readFileSync(new URL("index-v5.html", repo), "utf8");
assert.match(hub, /Mom's Garden/, "Hub should include a Mom's Garden tile");
assert.match(hub, /13 plantings/, "Hub Mom tile should summarize planting count");

const journal = readFileSync(new URL("journal.html", repo), "utf8");
assert.match(journal, /gos-bed\.js/, "Journal should load GosBed data");
assert.match(journal, /readMomJournalEntries/, "Journal should surface Mom data events");
assert.match(journal, /mom-garden-data\.json v1/, "Journal should dedupe and display Mom load events");

const doctor = readFileSync(new URL("garden-doctor-v5.html", repo), "utf8");
assert.match(doctor, /URLSearchParams/, "Doctor should read Planner URL context");
assert.match(doctor, /DoctorContextBar/, "Doctor should render Planner URL context");
assert.match(doctor, /peas:\s*\{[^}]*mono:'Ps'/s, "Doctor should know the Mom peas crop ID");

const sw = readFileSync(new URL("sw.js", repo), "utf8");
assert.match(sw, /data\/mom-garden-data\.json/, "Service worker should precache Mom data");

console.log(JSON.stringify({ ok: true, plantings: plantings.length, beds: momData.beds.length }, null, 2));
