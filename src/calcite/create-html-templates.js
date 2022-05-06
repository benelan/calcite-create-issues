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
      body {
        font-family: var(--calcite-sans-family);
        font-size: var(--calcite-font-size-0);
        color: var(--calcite-ui-text-1);
        max-width: 1024px;
        min-width: 280px;
        width: 70vw;
        padding: 0 var(--calcite-spacing-double);
        margin: 0 auto;
        background-color: var(--calcite-ui-background);
      }
      /* Theme Switcher */
      #theme-label {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2;
        background-color: var(--calcite-ui-background);
        border: 1px solid;
        border-color: var(--calcite-ui-border-1);
        border-radius: var(--calcite-border-radius);
        margin: 0;
        padding: 10px;
      }
      #theme-label label {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main>

      <!-- calcite-switch -->
      <div id="theme-label">
        <calcite-label layout="inline">
        Toggle theme
        <calcite-switch id="theme-switch"></calcite-switch>
        </calcite-label>
      </div>

      <h1><code>${component}</code></h1>

      <calcite-${component}></calcite-${component}>

    </main>
  </body>

  <script>
    window.onload = () => {
      // Theme Switcher
      const themeSwitch = document.getElementById("theme-switch");
      themeSwitch.addEventListener("calciteSwitchChange", () => {
      document.body.classList.toggle("calcite-theme-dark");
      });
    };

  </script>
</html>`;
}
