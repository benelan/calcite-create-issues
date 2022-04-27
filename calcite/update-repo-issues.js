#!/usr/bin/env node
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

/* THESE VARIABLES MAY NEED TO CHANGE*/
const baseUrl = "https://devtopia.esri.com/api/v3"; // use "https://api.github.com" for non-Enterprise GitHub
const repoOwner = "WebGIS"; // user or org
const repoName = "calcite-components";
const repoScopedPAT = ""; // add a Personal Access Token with 'repo' scope

const issueLabels = ["figma"];
const checklist = `
### Review 1

- [ ] Structure matches web component
- [ ] Props match web component
    - [ ] Props are in alphabetical order
    - [ ] Default prop value is first
    - [ ] Boolean props are always default false
- [ ] Slots are represented
- [ ] Meets naming conventions
- [ ] Styles are matched
- [ ] Behavior is correct
- [ ] Page format
    - [ ] Primary variant is top left
    - [ ] Variant labels
    - [ ] Documentation notes

### Review 2

- [ ] Structure matches web component
- [ ] Props match web component
    - [ ] Props are in alphabetical order
    - [ ] Default prop value is first
    - [ ] Boolean props are always default false
- [ ] Slots are represented
- [ ] Meets naming conventions
- [ ] Styles are matched
- [ ] Behavior is correct
- [ ] Page format
    - [ ] Primary variant is top left
    - [ ] Variant labels
    - [ ] Documentation notes

`;

if (!repoScopedPAT) {
  console.error(
    "The script is missing a 'repo' scoped GitHub Personal Access Token. Please make sure to fill in the correct information."
  );
  process.exit(1);
}

(async () => {
  try {
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

    // use pagination if you are updating more than 100 issues
    // https://octokit.github.io/rest.js/v18#pagination
    const issues = await octokit.rest.issues.listForRepo({
      owner: repoOwner,
      repo: repoName,
      labels: issueLabels[0], // lists issues that have the first label of the array
      per_page: 100, // max per page
    });

    // if you run into secondary rate limits (devtopia doesn't have any),
    // there is a solution in the `create-repo-issues.js` script
    issues.data.forEach((issue) => {
      octokit.rest.issues.update({
        owner: repoOwner,
        repo: repoName,
        issue_number: issue.number,
        body: issue.body + "\n\n" + checklist, // append to existing body
        labels: issueLabels, // add all labels of the array
      });
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
