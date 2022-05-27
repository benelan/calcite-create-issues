import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { sleep, toggleLoadingAnimation } from "../utils.js";

/* THESE VARIABLES MAY NEED TO CHANGE*/
const baseUrl = "https://api.github.com";
const repoOwner = "Esri"; // user or org
const repoName = "calcite-components";
const repoScopedPAT = ""; // add a Personal Access Token with 'repo' scope

const issueLabels = ["testing", "0 - new", "p - high"];

const issueTitle = (component) =>
  `[${component}] Implement screenshot test for center body alignment`;

  const issueBody = (component) => `### Test type

Screener

### Which Component(s)

${component}

### Unstable Tests

_no response_

### Test error, if applicable

_no response_

### PR skipped, if applicable

_no response_

### Additional Info

For epic #4632

https://esri.github.io/calcite-components

#### Scope

When components aren't accounting for when the body is aligned to center.

#### Action needed

Screenshot test needed to account for body alignment to center.`;

const components = [
  "Alert",
  "Block",
  "Card",
  "Flow",
  "Label",
  "Loader",
  "Modal",
  "Notice",
  "Panel",
  "Pick List",
  "Popover",
  "Shell",
  "Stepper",
  "Tabs",
  "Tile Select Group",
  "Tile Select",
  "Tile",
  "Tip",
  "Tooltip",
  "Tree",
  "Value List",
];

if (!repoScopedPAT) {
  console.error(
    "The script is missing a 'repo' scoped GitHub Personal Access Token."
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
    console.log("\n\nTotal issues created:", createdIssuesCount)
  );
});

(async () => {
  try {
    toggleLoadingAnimation("creating issues");

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
          process.exit(1);
        },
      },
    });

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
