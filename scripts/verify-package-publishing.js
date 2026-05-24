import fs from "node:fs";

const packageJsonText = fs.readFileSync("package.json", "utf8");
const workflowPath = ".github/workflows/publish.yml";
const workflowText = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, "utf8") : "";
const pkg = JSON.parse(packageJsonText);

const checks = [
  {
    name: "package.json has a single dependencies key",
    pass: (packageJsonText.match(/"dependencies"\s*:/g) || []).length === 1,
  },
  {
    name: "package publishes publicly",
    pass: pkg.publishConfig?.access === "public",
  },
  {
    name: "package includes provenance publish config",
    pass: pkg.publishConfig?.provenance === true,
  },
  {
    name: "publish workflow exists",
    pass: fs.existsSync(workflowPath),
  },
  {
    name: "publish workflow requests npm OIDC id-token",
    pass: /id-token:\s*write/.test(workflowText),
  },
  {
    name: "publish workflow uses npm trusted publishing path",
    pass: /npm publish/.test(workflowText) && !/NODE_AUTH_TOKEN/.test(workflowText),
  },
  {
    name: "publish workflow runs build and pack dry-run before publishing",
    pass: /npm run build/.test(workflowText) && /npm pack --dry-run/.test(workflowText),
  },
];

const failures = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
