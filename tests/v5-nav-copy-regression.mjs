import { readFileSync } from "node:fs";

const v5Files = [
  "index-v5.html",
  "garden-planner-v5.html",
  "garden-painting.html",
  "garden-doctor-v5.html",
  "how-it-thinks-v5.html",
];

const expectedCompactNav = ["Home", "Beds", "Planner", "Doctor", "Journal"];
const expectedHrefs = [
  "index-v5.html",
  "garden-painting.html",
  "garden-planner-v5.html",
  "garden-doctor-v5.html",
  "how-it-thinks-v5.html",
];

const failures = [];

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function extractTabLabels(source) {
  return [...source.matchAll(/\{\s*id:\s*['"][^'"]+['"],\s*label:\s*['"]([^'"]+)['"],\s*href:\s*['"]([^'"]+)['"]/g)]
    .map((match) => ({ label: match[1], href: match[2] }));
}

for (const file of v5Files) {
  const source = read(file);
  const tabs = extractTabLabels(source);
  const labels = tabs.map((tab) => tab.label);
  const hrefs = tabs.map((tab) => tab.href);

  if (labels.join("|") !== expectedCompactNav.join("|")) {
    failures.push(`${file}: expected compact nav labels ${expectedCompactNav.join(", ")}, got ${labels.join(", ")}`);
  }

  if (hrefs.join("|") !== expectedHrefs.join("|")) {
    failures.push(`${file}: expected compact nav hrefs ${expectedHrefs.join(", ")}, got ${hrefs.join(", ")}`);
  }

  if (tabs.some((tab) => tab.href === "#")) {
    failures.push(`${file}: compact nav contains href="#"`);
  }
}

const painting = read("garden-painting.html");
if (!painting.includes("<title>Garden OS · Beds (mobile beta)</title>")) {
  failures.push("garden-painting.html: document title should say Beds");
}

if (!painting.includes("<Disp size={24}>Beds</Disp>")) {
  failures.push("garden-painting.html: page heading should say Beds");
}

if (!painting.includes('<ToolBtn label="Paint"')) {
  failures.push("garden-painting.html: Paint tool button label should remain Paint");
}

if (!painting.includes("BRUSH MODE")) {
  failures.push("garden-painting.html: Brush Mode label should remain");
}

const hub = read("index-v5.html");
if (!hub.includes('<Tile title="Beds"')) {
  failures.push("index-v5.html: Beds tile should replace the top-level Paint tile");
}

const retiredPageCopy = [
  /\bOpen Painting\b/,
  /\bGo to Painting\b/,
  /\bin Painting\b/,
  /\bCreate one in Paint\b/,
  /\bSet up your bed in Painting\b/,
  /\bPlan tab\b/,
  /\bin Plan\b/,
  /\bGo to Plan\b/,
  /\byour Plan\b/,
  /\bOpen season log in Plan\b/,
];

for (const file of v5Files) {
  const source = read(file);
  for (const pattern of retiredPageCopy) {
    if (pattern.test(source)) {
      failures.push(`${file}: retired page copy remains: ${pattern}`);
    }
  }
}

const brokenIndexLinks = [
  'href="build-guide.html"',
  'href="ops-guide.html"',
];

for (const link of brokenIndexLinks) {
  if (hub.includes(link)) {
    failures.push(`index-v5.html: unresolved GitHub Pages relative link remains: ${link}`);
  }
}

if (failures.length) {
  throw new Error(`Garden OS v5 nav copy regression failed:\n${failures.join("\n")}`);
}

console.log(JSON.stringify({ ok: true, checked: v5Files }, null, 2));
