#!/usr/bin/env node

import { resolve } from "path";
import { URL } from "url";
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { getDirectories, sleep, toggleLoadingAnimation } from "../utils.js";

/* THESE VARIABLES MAY NEED TO CHANGE*/
const baseUrl = "https://devtopia.esri.com/api/v3"; // use "https://api.github.com" for non-Enterprise GitHub
const repoOwner = "WebGIS"; // user or org
const repoName = "calcite-design-system";
const repoScopedPAT = ""; // add a Personal Access Token with 'repo' scope

const issueLabels = ["figma"];
const issueTitle = (component) => `[${component}] Figma v2 design`;
const issueBody = (component) => `## Description
Create a Figma v2 design for ${component}.

## Requirements
> Designer should fill in what needs to be done (variants, themes, RTL, etc).

## Checklist
> Designer should fill in the general checklist that will be created.`;

const skipComponents = [
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

if (!repoScopedPAT) {
  console.error(
    "The script is missing a 'repo' scoped GitHub Personal Access Token.",
  );
  process.exit(1);
}

// The secondary rate limit may cause the script to stop.
// In the console, it will tell you how many issues were created during the run.
// Change createdIssueCount to that number, wait a while, and run the script again.
// https://docs.github.com/en/rest/overview/resources-in-the-rest-api#secondary-rate-limits
let createdIssuesCount = 0;
[
  `exit`,
  `SIGINT`,
  `SIGUSR1`,
  `SIGUSR2`,
  `uncaughtException`,
  `SIGTERM`,
].forEach((event) => {
  process.once(event, () =>
    console.log("\n\nTotal issues created:", createdIssuesCount),
  );
});

const componentsPath = resolve(
  new URL(".", import.meta.url).pathname,
  "calcite-design-system",
  "packages",
  "calcite-components",
  "src",
  "components",
);

(async () => {
  try {
    toggleLoadingAnimation("creating issues");
    const componentDirectories = await getDirectories(componentsPath);

    const ThrottledOctokit = Octokit.plugin(throttling);
    const octokit = new ThrottledOctokit({
      baseUrl,
      auth: repoScopedPAT,
      throttle: {
        onRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`,
          );

          if (options.request.retryCount < 5) {
            octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
          );
          process.exit(1);
        },
      },
    });

    const components = componentDirectories.filter(
      (c) => !skipComponents.includes(c),
    );

    for (const [index, component] of components.entries()) {
      if (createdIssuesCount <= index) {
        await octokit.rest.issues.create({
          owner: repoOwner,
          repo: repoName,
          title: issueTitle(component),
          body: issueBody(component),
          labels: issueLabels,
        });
        createdIssuesCount++;
        await sleep(2000);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
