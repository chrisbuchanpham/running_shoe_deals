import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const htmlFiles = [
  path.join(distDir, "index.html"),
  path.join(distDir, "running_shoe_deals", "index.html")
];

async function assertFileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
  } catch {
    throw new Error(`[verify-build-paths] missing file: ${filePath}`);
  }
}

function assertAssetLinks(html, filePath) {
  if (/src=["']\/assets\//i.test(html) || /href=["']\/assets\//i.test(html)) {
    throw new Error(
      `[verify-build-paths] found root-absolute asset path in ${filePath}; expected relative ./assets paths.`
    );
  }

  if (!/(?:src|href)=["']\.\/assets\//i.test(html)) {
    throw new Error(
      `[verify-build-paths] did not find relative ./assets path in ${filePath}.`
    );
  }
}

async function run() {
  for (const htmlFile of htmlFiles) {
    await assertFileExists(htmlFile);
    const html = await readFile(htmlFile, "utf8");
    assertAssetLinks(html, htmlFile);
  }

  console.log("[verify-build-paths] verified relative asset paths in build output");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
