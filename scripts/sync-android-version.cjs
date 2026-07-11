#!/usr/bin/env node
/**
 * Syncs android/app/build.gradle's versionName to match package.json's
 * "version" field, and bumps versionCode by 1 every time this runs.
 *
 * versionName mirrors your web app's semver (e.g. "3.0.0") so the two
 * never drift apart. versionCode is a separate, strictly-increasing
 * integer that Android/Play Store use internally to know one build is
 * newer than another — it must go up by at least 1 on every release,
 * regardless of what the semver string says (Play Store rejects an
 * upload whose versionCode isn't higher than the last one published).
 *
 * Usage: node scripts/sync-android-version.cjs
 * (run this before `npx cap sync android` when preparing a native build)
 */

const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const gradlePath = path.join(__dirname, "..", "android", "app", "build.gradle");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const newVersionName = pkg.version;
if (!newVersionName) {
  throw new Error(`No "version" field found in ${pkgPath}`);
}

let gradle = fs.readFileSync(gradlePath, "utf8");

const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/);
if (!versionCodeMatch) {
  throw new Error(`Could not find "versionCode <number>" in ${gradlePath}`);
}
const oldVersionCode = parseInt(versionCodeMatch[1], 10);
const newVersionCode = oldVersionCode + 1;

const versionNameMatch = gradle.match(/versionName\s+"([^"]*)"/);
if (!versionNameMatch) {
  throw new Error(`Could not find 'versionName "..."' in ${gradlePath}`);
}
const oldVersionName = versionNameMatch[1];

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${newVersionName}"`);

fs.writeFileSync(gradlePath, gradle);

console.log("Synced Android version:");
console.log(`  versionName: "${oldVersionName}" -> "${newVersionName}"  (from package.json)`);
console.log(`  versionCode: ${oldVersionCode} -> ${newVersionCode}  (auto-incremented)`);
