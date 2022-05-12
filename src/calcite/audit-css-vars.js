#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
import { resolve } from "path";
import { URL } from "url";
import fs from "fs";
const {
  createWriteStream, promises: { readdir, readFile }
} = fs;

const __dirname = new URL(".", import.meta.url).pathname;

const componentsPath = resolve(
  __dirname,
  "calcite-components",
  "src",
  "components"
);
const outputPath = resolve(__dirname, "css-var-audit.md");

const skip = [
  "functional",
  "color-picker-hex-input",
  "color-picker-swatch",
  "date-picker-day",
  "date-picker-month",
  "date-picker-month-header",
  "handle",
  "sortable-list",
];

(async () => {
  try {
    const stream = createWriteStream(outputPath);
    stream.write("| Component | CSS Variables | Documented CSS Variables |\n| ----- | ----- | ----- |\n");

    const components = (await readdir(componentsPath, { withFileTypes: true }))
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((c) => !skip.includes(c));

    for (const component of components) {
      const stylesheet = await readFile(resolve(componentsPath, component, `${component}.scss`), "utf8");
      // match css vars, make unique, sort
      const cssVars = [...new Set(stylesheet.match(/--calcite-[^\]\)\}\;\:\,\s]*/g))].sort();
      // match the css vars documented at the top of the stylesheet in the comments
      const cssVarsDocd = [...new Set(stylesheet.match(/(?<=\* \@prop )--calcite-[^\]\)\}\;\:\,\s]*/g))].sort();

      stream.write(`| ${component} | ${cssVars.join("<br />")} | ${cssVarsDocd.join("<br />")} |\n`);
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();