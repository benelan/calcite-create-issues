#!/usr/bin/env node
import { resolve } from "path";
import { readdir } from "fs/promises";
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import config from "./config.js";

const { token, baseUrl, repo, owner } = config;

const COMPONENTS_PATH = resolve(
  process.cwd(),
  "calcite-components",
  "src",
  "components"
);

const SKIP_COMPONENTS = [
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

const createIssueBody = (component) => `## Description
Create a Figma v2 design for ${component}.

## Requirements
> Designer should fill in what needs to be done (variants, themes, RTL, etc).

## Checklist
> Designer should fill in the general checklist that will be created.`;

const getDirectories = async (directoryPath) =>
  (await readdir(directoryPath, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

(async () => {
  try {
    const MyOctokit = Octokit.plugin(throttling);

    const octokit = new MyOctokit({
      auth: token,
      baseUrl: `${baseUrl}/api/v3`,
      throttle: {
        onRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`
          );

          if (options.request.retryCount < 5) {
            octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`
          );
        },
      },
    });

    const componentDirectories = await getDirectories(COMPONENTS_PATH);

    for (const component of componentDirectories) {
      if (SKIP_COMPONENTS.includes(component)) continue;

      // create issues
      octokit.rest.issues.create({
        owner,
        repo,
        title: `Figma v2 design: ${component}`,
        body: createIssueBody(component),
        labels: ["figma"],
      });
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
