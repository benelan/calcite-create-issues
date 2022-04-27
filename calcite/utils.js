import { readdir } from "fs/promises";

export const getDirectories = async (directoryPath) =>
  (await readdir(directoryPath, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const toggleLoadingAnimation = (() => {
  let called = false;
  let interval;

  return () => {
    if (!called) {
      // clear interval for all exit event types
      [
        `exit`,
        `SIGINT`,
        `SIGUSR1`,
        `SIGUSR2`,
        `uncaughtException`,
        `SIGTERM`,
      ].forEach((event) => {
        process.once(event, toggleLoadingAnimation);
      });
      // hide cursor
      process.stdout.write("\u001B[?25l\r");
      let count = 0;
      interval = setInterval(() => {
        if (count % 7 === 0)
        // delete line, send cursor back to start, add message
        process.stdout.write("\u001B[2K\rcreating issues");
      else process.stdout.write(".");
      count += 1;
      }, 100);
      called = true;
    } else {
      clearInterval(interval);
      // show cursor and delete loading message
      process.stdout.write(`\u001B[2K\r\u001B[?25h`);
    }
  };
})();