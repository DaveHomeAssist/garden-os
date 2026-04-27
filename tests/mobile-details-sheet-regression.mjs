import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const repo = new URL("../", import.meta.url);
const painting = readFileSync(new URL("garden-painting.html", repo), "utf8");
const momGarden = readFileSync(new URL("data/mom-garden-data.json", repo), "utf8");

assert.match(painting, /label="Details"/, "Tool row should expose Details, not Inspect");
assert.doesNotMatch(painting, /label="Inspect"/, "Inspect should not be a visible tool label");
assert.match(painting, /isMobileViewport/, "Cell dispatcher should branch on the mobile viewport");
assert.match(painting, /setCellSheet\(/, "Mobile cell taps should open a bottom sheet");
assert.match(painting, /role="dialog"/, "Cell sheet should render as a dialog");
assert.match(painting, /aria-modal="true"/, "Cell sheet should be modal for screen readers");
assert.match(painting, /aria-live="polite"/, "Cell sheet should announce opened cell context");
assert.match(painting, /Coming soon/, "Move action should be present but disabled");
assert.match(painting, /garden-doctor-v5\.html\?/, "Ask Doctor should link with cell context params");
assert.match(painting, /No journal entries yet\./, "Details sheet should always render journal fallback");
assert.match(painting, /Cleared \{cropName\} from R\{r \+ 1\}·C\{c \+ 1\}/, "Erase toast should include undoable cell summary");
assert.match(painting, /focusable\[0\]\.focus\(\)/, "Sheet should focus the first interactive control on open");
assert.match(painting, /e\.key === 'Escape'/, "Escape should close the sheet");
assert.match(painting, /restoreFocusRef\.current\.focus\(\)/, "Closing should restore focus to the tapped cell");
assert.match(painting, /function cropPaletteLabel/, "Crop palette should disambiguate duplicate crop names");
assert.match(painting, /function paletteCropIds/, "Visible crop pickers should use a curated palette id list");
assert.match(painting, /car:\s*\{[^}]*palette:false/, "Legacy carrot alias should stay readable but hidden from visible pickers");
assert.match(painting, /kal:\s*\{[^}]*palette:false/, "Legacy kale alias should stay readable but hidden from visible pickers");
assert.doesNotMatch(painting, /\{Object\.keys\(CROPS\)\.map\(k =>/, "Visible crop pickers should not render every catalog key");
assert.match(painting, /Leaf Lettuce/, "Generic lettuce should be visibly distinct in the palette");
assert.match(painting, /Head Lettuce/, "Head lettuce should be visibly distinct in the palette");
assert.match(painting, /red_lettuce:\s*\{[^}]*label:'Red Lettuce'[^}]*color:RED_LETTUCE_COLOR/s, "Red lettuce should be its own red palette option");
assert.match(painting, /let:\s*\{[^}]*label:'Leaf Lettuce'[\s\S]*red_lettuce:\s*\{[^}]*label:'Red Lettuce'[\s\S]*head_lettuce:\s*\{[^}]*label:'Head Lettuce'/, "Red lettuce should appear before the second green lettuce option");
assert.match(painting, /cellVarietyLabel/, "Selected occupied cells should surface variety labels");
assert.match(momGarden, /Parris Island Cos|Marvel of Four Seasons/, "Mom lettuce varieties should remain available to visible copy paths");
assert.match(momGarden, /"id": "mom_lettuce_butterhead_red_marvel_left"[\s\S]*"cropId": "red_lettuce"/, "Mom's red butterhead lettuce should use the red lettuce crop id");
assert.match(painting, /function cropVisualForPlanting/, "Bed cells should derive visual color from planting-level variety data");
assert.match(painting, /RED_LETTUCE_COLOR/, "Red lettuce should have a dedicated visual color");
assert.match(painting, /data-crop-color/, "Rendered bed cells should expose resolved crop color for browser verification");
assert.doesNotMatch(painting, /dangerouslySetInnerHTML|innerHTML/, "Sheet should not render untrusted text as HTML");

console.log(JSON.stringify({ ok: true }, null, 2));
