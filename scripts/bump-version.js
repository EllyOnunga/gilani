import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.join(__dirname, "../public/sw.js");
const pkgPath = path.join(__dirname, "../package.json");

try {
  // Read package.json version
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkg.version;

  if (!version) {
    console.error("Error: Version not found in package.json");
    process.exit(1);
  }

  // Read sw.js
  let swContent = fs.readFileSync(swPath, "utf8");

  // Replace version comment
  swContent = swContent.replace(
    /\/\/ GilaniAI Service Worker — v\d+\.\d+\.\d+/,
    `// GilaniAI Service Worker — v${version}`,
  );

  // Replace CACHE_NAME
  swContent = swContent.replace(
    /const CACHE_NAME = 'gilaniai-v\d+\.\d+\.\d+';/,
    `const CACHE_NAME = 'gilaniai-v${version}';`,
  );

  fs.writeFileSync(swPath, swContent, "utf8");
  console.log(`Successfully updated public/sw.js to version v${version}`);
} catch (error) {
  console.error("Failed to update public/sw.js version:", error);
  process.exit(1);
}
