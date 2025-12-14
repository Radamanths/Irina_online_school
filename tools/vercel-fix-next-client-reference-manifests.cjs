/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

function walk(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function collectStrings(value, out) {
  if (typeof value === "string") {
    out.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) collectStrings(value[key], out);
  }
}

function ensureFileExists(filePath) {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "", "utf8");
  return true;
}

function main() {
  // This script is meant to unblock a Vercel tracing failure.
  if (!process.env.VERCEL) return;

  const projectRoot = process.cwd();
  const nextServerDir = path.join(projectRoot, ".next", "server");

  if (!fs.existsSync(nextServerDir)) return;

  const allFiles = walk(nextServerDir);
  const nftFiles = allFiles.filter((p) => p.endsWith(".nft.json"));

  const missing = new Set();

  for (const nftPath of nftFiles) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(nftPath, "utf8"));
    } catch {
      continue;
    }

    const strings = [];
    collectStrings(json, strings);

    const nftDir = path.dirname(nftPath);

    for (const s of strings) {
      if (!s.endsWith("_client-reference-manifest.js")) continue;

      // Next's file tracing resolves relative paths from the traced file's directory.
      // If we resolve from project root, we create the file in the wrong location
      // and Vercel will still fail with ENOENT during lstat.
      const resolved = path.isAbsolute(s) ? s : path.resolve(nftDir, s);
      if (!fs.existsSync(resolved)) missing.add(resolved);
    }
  }

  if (missing.size === 0) return;

  let createdCount = 0;
  for (const p of missing) {
    if (ensureFileExists(p)) createdCount += 1;
  }

  if (createdCount > 0) {
    console.log(
      `[vercel-fix] Created ${createdCount} missing *_client-reference-manifest.js file(s) to satisfy tracing.`
    );
  }
}

main();
