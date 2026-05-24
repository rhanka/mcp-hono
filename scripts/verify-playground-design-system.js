import fs from "node:fs";

const source = fs.readFileSync("src/playground.ts", "utf8");

const checks = [
  {
    name: "uses Sentropic token imports",
    pass: source.includes("@sentropic/design-system-tokens") && source.includes("toCssVariables"),
  },
  {
    name: "does not load non-token Google fonts",
    pass: !source.includes("fonts.googleapis.com") && !source.includes("Outfit"),
  },
  {
    name: "does not use emoji as UI icons",
    pass: !/[🛠📦📝⚡✨🤖🚀🌟🎨💻📜]/u.test(source),
  },
  {
    name: "keeps generated markup free of inline style attributes",
    pass: !/style=/.test(source),
  },
  {
    name: "removes dark-mode and glow legacy language",
    pass: !/dark-mode|glow|glass|Ambient Space/i.test(source),
  },
  {
    name: "defines system icon classes",
    pass:
      source.includes("icon icon-${name}") &&
      source.includes("aria-hidden=\"true\"") &&
      source.includes("id=\"icon-tool\""),
  },
  {
    name: "uses design-system component aliases",
    pass:
      source.includes("--control-height: var(--st-control-md-height") &&
      source.includes("--button-radius: var(--st-button-radius") &&
      source.includes("--card-radius: var(--st-card-radius"),
  },
];

const failures = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
