#!/usr/bin/env node

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { readFile } from "fs/promises";
import { toggleLoadingAnimation } from "../utils.js";

/* THESE VARIABLES MAY NEED TO CHANGE*/
const baseUrl = "https://api.github.com";
const repoOwner = "Esri"; // user or org
const repoName = "calcite-design-system";
const repoScopedPAT = ""; // add a Personal Access Token with 'repo' scope

if (!repoScopedPAT) {
  console.error(
    "The script is missing a 'repo' scoped GitHub Personal Access Token."
  );
  process.exit(1);
}

(async () => {
  try {
    toggleLoadingAnimation("Adding product team labels to existing stakeholder issues")
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
        onSecondaryRateLimit: (_, options, octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`
          );
          process.exit(1);
        },
      },
    });
    let issuesLabeled = [];
    let seenProductLabels = [];
    let missingProductLabels = [];

    const data = await readFile("data.csv", { encoding: "utf8" });
    const dataRows = data.split("\n");
    for (const row of dataRows) {
      if (!row || row.startsWith("Name")) continue;
      const rowArray = row.split(",");
      const productTeam = rowArray[1].trim();
      const githubUsername = rowArray[2].trim();

      // don't confirm label existence if we already checked
      if (!seenProductLabels.includes(productTeam)) {
        try {
          await octokit.rest.issues.getLabel({
            owner: repoOwner,
            repo: repoName,
            name: productTeam,
          });
        } catch (e) {
          // create the label if it doesn't exist
          // await octokit.rest.issues.createLabel({
          //   owner: repoOwner,
          //   repo: repoName,
          //   name: productTeam,
          //   color: "006B75",
          //   description: `Issues logged by ${productTeam} team members.`,
          // });
          // console.log(`created ${productTeam} label`);
          missingProductLabels.push(productTeam);
        }
        seenProductLabels.push(productTeam);
      }

      const issues = await octokit.rest.issues.listForRepo({
        owner: repoOwner,
        repo: repoName,
        state: "open",
        creator: githubUsername,
        per_page: 100,
      });

      if (issues.data.length >= 99) {
        console.warn(
          `${githubUsername} may have more than 100 created issues open. Please confirm and run page 2 if necessary`
        );
      }

      for (const issue of issues.data) {
        if (!issue.labels.map((label) => label.name).includes(productTeam)) {
          // add product team label
          await octokit.rest.issues.addLabels({
            issue_number: issue.number,
            owner: repoOwner,
            repo: repoName,
            labels: [productTeam],
          });
          issuesLabeled.push(issue.number);
        }
      }
    }

    toggleLoadingAnimation()
    console.log(
      `\nAdded labels to the following ${issuesLabeled.length} issues:\n`
    );
    issuesLabeled.forEach((_, index) => {
      console.log(
        `https://github.com/${repoOwner}/${repoName}/issues/${issuesLabeled[index]}`
      );
    });

    if (missingProductLabels.length) {
      console.log(
        `\nThe ${missingProductLabels.length} product team names below do not have a matching label. Please check the existing labels for spelling or naming variations:`,
        "\nhttps://github.com/Esri/calcite-design-system/labels?q=logged",
        "\nIf the product label doesn't exist, please add it and rerun the script."
      );
      missingProductLabels.forEach((_, index) => {
        console.log(missingProductLabels[index]);
      });
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
