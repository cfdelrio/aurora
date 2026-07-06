// Dev-only page generator for UI-001 (Athlete Home). Renders the sample-scenario page to a static,
// self-contained HTML file so the slice can be reviewed visually. A development tool, not a product
// runtime: no server, no watch mode, no deployment, and NOT a scripts/ entry (the scripts/ allowlist
// stays exactly as approved — this file is invoked directly).
//
//   usage: node src/athlete-home/sample/generate-athlete-home-page.ts [outPath]
//   default outPath: ./athlete-home.html (gitignored — the generated artifact is never committed)

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderAthleteHomePage } from "../page/render-athlete-home.ts";
import { sampleAthleteHomeViewModel } from "./athlete-home-sample-scenario.ts";

const out = resolve(process.argv[2] ?? "athlete-home.html");
writeFileSync(out, renderAthleteHomePage(sampleAthleteHomeViewModel()));
console.log(`athlete-home page written to ${out}`);
