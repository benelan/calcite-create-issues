#!/usr/bin/env node
const { resolve } = require( "path");
const { mkdir, readdir, writeFile } = require( "fs/promises");

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
  __dirname,
  "calcite-components",
  "src",
  "components"
);

(async () => {
  try {
    const outdir = resolve(__dirname, "html-templates");
    await mkdir(outdir, { recursive: true });

    const components = (await readdir(componentsPath, { withFileTypes: true }))
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((c) => !skip.includes(c));

    for (const component of components) {
      const outfile = resolve(outdir, `${component}.html`);
      await writeFile(outfile, getHTML(component));
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

function getHTML(component) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <title>${component}</title>
    <script
      type="module"
      src="https://unpkg.com/@esri/calcite-components@1.0.0-beta.81/dist/calcite/calcite.esm.js"
    ></script>
    <link
      rel="stylesheet"
      type="text/css"
      href="https://unpkg.com/@esri/calcite-components@1.0.0-beta.81/dist/calcite/calcite.css"
    />
    <style>
      h1,
      calcite-${component} {
        margin-bottom: 5rem;
      }
      h2 {
        margin-bottom: 3rem;
      }
      main {
        padding: 3rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1><code>${component}</code></h1>

      <calcite-${component}></calcite-${component}>
    </main>
  </body>
</html>`;
}
