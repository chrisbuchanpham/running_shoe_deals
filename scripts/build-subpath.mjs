import { access, copyFile, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const SUBPATH = "running_shoe_deals";

const distDir = path.resolve(process.cwd(), "dist");
const sourceIndexPath = path.join(distDir, "index.html");
const source404Path = path.join(distDir, "404.html");
const targetDir = path.join(distDir, SUBPATH);
const targetIndexPath = path.join(targetDir, "index.html");
const target404Path = path.join(targetDir, "404.html");

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  if (!(await fileExists(sourceIndexPath))) {
    throw new Error(`[build-subpath] missing required source file: ${sourceIndexPath}`);
  }

  await mkdir(targetDir, { recursive: true });
  await copyFile(sourceIndexPath, targetIndexPath);

  if (await fileExists(source404Path)) {
    await copyFile(source404Path, target404Path);
  }

  console.log("[build-subpath] created running_shoe_deals alias");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
