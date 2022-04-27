import { readdir } from "fs/promises";

export const getDirectories = async (directoryPath) =>
(await readdir(directoryPath, { withFileTypes: true }))
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name);
