#!/usr/bin/env node
import { resolve } from "path";
import { createWriteStream } from "fs";
import { getDirectories } from "../utils.js";

const assignees = ["Add", "Assignees", "Here"];

const skip = [
  "functional",
  "color-picker-hex-input",
  "color-picker-swatch",
  "date-picker-day",
  "date-picker-month",
  "date-picker-month-header",
  "graph",
  "handle",
  "sortable-list",
];

const componentsPath = resolve(
  process.cwd(),
  "calcite-components",
  "src",
  "components"
);
const outputPath = resolve("component-checklist.md");

(async () => {
  try {
    const componentDirectories = await getDirectories(componentsPath);
    const stream = createWriteStream(outputPath);

    const componentsPerAssignee =
      (componentDirectories.length - skip.length) / assignees.length;
    for (const [index, component] of Object.entries(componentDirectories)) {
      if (skip.includes(component)) {
        continue;
      }

      const assigneeIndex = Math.max(
        Math.floor((index - skip.length) / componentsPerAssignee),
        0
      );
      stream.write(`- [ ] \`${component}\` (${assignees[assigneeIndex]})\n`);
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
