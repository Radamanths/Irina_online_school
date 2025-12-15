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

function toPosixPath(p) {
  return p.replace(/\\/g, "/");
}

function withLeadingDotSlash(p) {
  if (p.startsWith("./") || p.startsWith("../")) return p;
  return `./${p}`;
}

function stripRouteGroupsFromAppServerPath(filePath) {
  const posix = toPosixPath(filePath);
  const marker = "/.next/server/app/";
  const idx = posix.indexOf(marker);
  if (idx === -1) return filePath;

  const prefix = posix.slice(0, idx + marker.length);
  const rest = posix.slice(idx + marker.length);

  // Remove Next.js route groups like `(dashboard)/`.
  const strippedRest = rest.replace(/\([^/]+\)\//g, "");
  return path.normalize(prefix + strippedRest);
}

function ensureShimFile(targetPath, candidatePath) {
  if (fs.existsSync(targetPath)) return false;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const rel = path.relative(path.dirname(targetPath), candidatePath);
  const relPosix = toPosixPath(withLeadingDotSlash(rel));

  const content =
    "// Auto-generated on Vercel to satisfy tracing for Next.js route groups.\n" +
    "// This shim keeps runtime stable by loading the real client reference manifest.\n" +
    `try { require(${JSON.stringify(relPosix)}); } catch (_) {}\n`;

  fs.writeFileSync(targetPath, content, "utf8");
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
  let skippedCount = 0;

  for (const targetPath of missing) {
    const candidatePath = stripRouteGroupsFromAppServerPath(targetPath);
    if (candidatePath === targetPath || !fs.existsSync(candidatePath)) {
      skippedCount += 1;
      continue;
    }

    if (ensureShimFile(targetPath, candidatePath)) createdCount += 1;
  }

  if (createdCount > 0) {
    console.log(
      `[vercel-fix] Created ${createdCount} shim *_client-reference-manifest.js file(s) to satisfy tracing.`
    );
  }

  if (skippedCount > 0) {
    console.log(`[vercel-fix] Skipped ${skippedCount} manifest(s) (no safe candidate found).`);
  }
}

main();
