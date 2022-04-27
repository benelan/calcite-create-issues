#!/usr/bin/env node
import { resolve } from "path";
import { readdir } from "fs/promises";
import { URL } from "url";
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

const componentsPath = resolve(
  new URL(".", import.meta.url).pathname,
  "calcite-components",
  "src",
  "components"
);

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

const baseUrl = "https://devtopia.esri.com/api/v3"; // use "https://api.github.com" for non-Enterprise GitHub

const repoScopedPAT = "";
const repoOwner = "WebGIS"; // user or org
const repoName = "calcite-components";

const issueLabels = ["figma"];
const issueTitle = (component) => `Figma v2 design: ${component}`;
const issueBody = (component) => `## Description
Create a Figma v2 design for ${component}.

## Requirements
> Designer should fill in what needs to be done (variants, themes, RTL, etc).

## Checklist
> Designer should fill in the general checklist that will be created.`;

// The secondary rate limit will cause the script to stop. (may not apply to Enterprise)
// In the console, it will tell you how many issues were created during the run.
// Change createdIssueCount to that number, wait a while, and run the script again.
// https://docs.github.com/en/rest/overview/resources-in-the-rest-api#secondary-rate-limits
let createdIssuesCount = 0;
let progressInterval;

const getDirectories = async (directoryPath) =>
  (await readdir(directoryPath, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

(async () => {
  try {
    showProgress();
    const componentDirectories = await getDirectories(componentsPath);

    const ThrottledOctokit = Octokit.plugin(throttling);
    const octokit = new ThrottledOctokit({
      baseUrl,
      auth: repoScopedPAT,
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

    for (const [index, component] of componentDirectories.entries()) {
      if (skipComponents.includes(component) || createdIssuesCount + 1 >= index)
        continue;

      await octokit.rest.issues.create({
        owner: repoOwner,
        repo: repoName,
        title: issueTitle(component),
        body: issueBody(component),
        labels: issueLabels,
      });

      createdIssuesCount += 1;
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();

function showProgress() {
  if (!progressInterval) {
    // clear interval for all exit types
    [
      `exit`,
      `SIGINT`,
      `SIGUSR1`,
      `SIGUSR2`,
      `uncaughtException`,
      `SIGTERM`,
    ].forEach((event) => {
      process.once(event, showProgress);
      process.once(event, () =>
        console.log("\n\nTotal issues created:", createdIssuesCount)
      );
    });
    // hide cursor
    process.stdout.write("\u001B[?25l\r");
    let count = 0;
    progressInterval = setInterval(() => {
      if (count % 7 === 0)
        // delete line, send cursor back to start, add message
        process.stdout.write("\u001B[2K\rcreating issues");
      else process.stdout.write(".");
      count += 1;
    }, 150);
  } else {
    clearInterval(progressInterval);
    // show cursor and delete loading icons
    process.stdout.write(`\u001B[2K\r\u001B[?25h`);
  }
}
