#!/usr/bin/env node

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { writeFile } from "fs/promises";
import { toggleLoadingAnimation } from "../utils.js";

/* THESE VARIABLES MAY NEED TO CHANGE*/
const baseUrl = "https://api.github.com";
const repoOwner = "Esri"; // user or org
const repoName = "calcite-design-system";
const repoScopedPAT = ""; // add a Personal Access Token with 'repo' scope

if (!repoScopedPAT) {
  console.error(
    "The script is missing a 'repo' scoped GitHub Personal Access Token.",
  );
  process.exit(1);
}

const output = {};

(async () => {
  try {
    toggleLoadingAnimation(
      "Generating milestone estimates for the calcite-design-system repo...",
    );
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
        onSecondaryRateLimit: (_, options, octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
          );
          process.exit(1);
        },
      },
    });

    const milestones = await octokit.rest.issues.listMilestones({
      owner: repoOwner,
      repo: repoName,
      state: "closed",
      sort: "due_on",
      per_page: 16,
      direction: "desc",
    });

    if (milestones.data.length === 0) {
      console.error("No closed milestones found.");
      process.exit(1);
    }

    for (const milestone of milestones.data) {
      output[milestone.number] = {
        due_on: milestone.due_on,
        title: milestone.title,
        description: milestone.description,
        closed_issues: 0,
        issues_with_estimate: 0,
        effort_estimate: 0,
      };

      const issues = await octokit.rest.issues.listForRepo({
        owner: repoOwner,
        repo: repoName,
        milestone: milestone.number,
        state: "closed",
        per_page: 100,
      });

      for (const issue of issues.data) {
        if (issue.pull_request) {
          continue;
        }

        output[milestone.number].closed_issues++;

        for (const label of issue.labels) {
          if (label.name.match(/estimate/)) {
            output[milestone.number].issues_with_estimate++;
            output[milestone.number].effort_estimate += Number.parseInt(
              label.name.replace(/\D/g, ""),
            );
            break;
          }
        }
      }
    }

    await writeFile(
      "./milestone-estimates.json",
      JSON.stringify(output, null, 2),
    );

    toggleLoadingAnimation();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
