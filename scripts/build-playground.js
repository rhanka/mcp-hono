import fs from "fs";
import path from "path";
import { getPlaygroundHtml } from "../dist/playground.js";

// Make sure output directory exists
const distDir = path.resolve("dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Mock parameters to compile the standalone static file
const mockInfo = {
  name: "Sentropic MCP Console",
  version: "0.1.0",
  description: "Standalone decoupled Model Context Protocol development console",
};

// Generate standalone HTML
const html = getPlaygroundHtml(mockInfo, [], [], []);

// Write output file
const outputPath = path.join(distDir, "playground.html");
fs.writeFileSync(outputPath, html, "utf-8");

console.log(`\n✨ Decoupled static playground compiled successfully to: dist/playground.html\n`);
