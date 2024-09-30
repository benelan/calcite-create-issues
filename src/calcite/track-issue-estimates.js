#!/usr/bin/env node
// @ts-check

import { resolve } from "path";
import { writeFile } from "fs/promises";
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { toggleLoadingAnimation } from "../utils.js";

/* THESE VARIABLES MAY NEED TO CHANGE*/
const baseUrl = "https://api.github.com";
const owner = "Esri"; // user or org
const repo = "calcite-design-system";
const repoScopedPAT = process.env.GH_TOKEN; // add a Personal Access Token with 'repo' scope

if (!repoScopedPAT) {
  console.error(
    "The script is missing a 'repo' scoped GitHub Personal Access Token.",
  );
  process.exit(1);
}

(async () => {
  try {
    toggleLoadingAnimation(
      `Generating milestone estimates for the ${repo} repo...`,
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

    const outputJson = {};
    let outputCsv =
      "id,title,due_on,open_issues,closed_issues,remaining_estimate,completed_estimate";

    const milestones = await octokit.rest.issues.listMilestones({
      owner: owner,
      repo: repo,
      state: "all",
      sort: "due_on",
      per_page: 100,
      direction: "desc",
    });

    if (milestones.data.length === 0) {
      console.error("No milestones found.");
      process.exit(1);
    }

    for (const milestone of milestones.data) {
      outputJson[milestone.number] = {
        title: milestone.title,
        due_on: milestone.due_on,
        open_issues: milestone.open_issues,
        closed_issues: milestone.closed_issues,
        remaining_estimate: 0,
        completed_estimate: 0,
      };

      const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
        // @ts-ignore milestone.number is valid: https://docs.github.com/en/rest/issues/issues#list-repository-issues--parameters
        milestone: milestone.number,
        owner: owner,
        repo: repo,
        state: "all",
        per_page: 100,
      });

      for (const issue of issues) {
        if (issue.pull_request) {
          continue;
        }

        for (const label of issue.labels) {
          const estimateLabelMatch = (
            typeof label === "string" ? label : label?.name
          )?.match(/estimate - (\d+)/);

          if (estimateLabelMatch?.length > 1) {
            outputJson[milestone.number][
              issue.state === "open"
                ? "remaining_estimate"
                : "completed_estimate"
            ] += Number.parseInt(estimateLabelMatch[1]);

            break; // assumes an issue will only have one estimate label
          }
        }
      }

      outputCsv = `${outputCsv}\n${milestone.number},${Object.values(outputJson[milestone.number]).join(",")}`;
    }

    const stringifiedOutputJson = JSON.stringify(outputJson, null, 2);

    await writeFile("./milestone-estimates.csv", outputCsv);
    await writeFile("./milestone-estimates.json", stringifiedOutputJson);

    toggleLoadingAnimation();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
