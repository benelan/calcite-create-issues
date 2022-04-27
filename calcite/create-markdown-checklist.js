#!/usr/bin/env node
import { resolve } from "path";
import { URL } from "url";
import { createWriteStream } from "fs";
import { readdir } from "fs/promises";

// evenly adds names next to components in the checklist
// an empty array skips adding names
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
  new URL(".", import.meta.url).pathname,
  "calcite-components",
  "src",
  "components"
);

const outputPath = resolve("component-checklist.md");

const getDirectories = async (directoryPath) =>
  (await readdir(directoryPath, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

(async () => {
  try {
    const componentDirectories = await getDirectories(componentsPath);
    const stream = createWriteStream(outputPath);

    const componentsPerAssignee =
      (componentDirectories.length - skip.length) / assignees.length;

    componentDirectories
      .filter((c) => !skip.includes(c))
      .forEach((component, index) => {
        const assigneeIndex = Math.floor(index / componentsPerAssignee);

        stream.write(`- [ ] \`${component}\``);
        stream.write(
          assignees.length ? ` (${assignees[assigneeIndex]})\n` : "\n"
        );
      });
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
