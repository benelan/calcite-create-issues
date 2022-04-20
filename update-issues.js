#!/usr/bin/env node
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

const baseUrl = "https://devtopia.esri.com/api/v3"; // use "https://api.github.com" for non-Enterprise GitHub

const repoScopedPAT = "";
const repoOwner = "WebGIS"; // user or org
const repoName = "calcite-components";

const issueLabels = ["figma"];
const checklist = `

## Requirements

> Designer can fill in what needs to be done (variants, themes, RTL, etc).

## Checklists

Use the checklists during review.

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

(async () => {
  try {
    const MyOctokit = Octokit.plugin(throttling);
    const octokit = new MyOctokit({
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

    const issues = await octokit.rest.issues.listForRepo({
      owner: repoOwner,
      repo: repoName,
      labels: issueLabels[0],
      per_page: 100
    });

    issues.data.forEach(issue => {
      octokit.rest.issues.update({
        owner: repoOwner,
        repo: repoName,
        issue_number: issue.number,
        body: checklist,
        labels: issueLabels
      });
    })

  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
