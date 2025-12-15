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

  const rel = candidatePath
    ? path.relative(path.dirname(targetPath), candidatePath)
    : null;
  const relPosix = rel ? toPosixPath(withLeadingDotSlash(rel)) : null;

  const content =
    "// Auto-generated on Vercel to satisfy tracing for Next.js route groups.\n" +
    "// IMPORTANT: must export a valid manifest object (Next expects clientModules).\n" +
    "let __m;\n" +
    (relPosix
      ? `try { __m = require(${JSON.stringify(relPosix)}); } catch (_) {}\n`
      : "") +
    "if (__m && typeof __m === 'object' && __m.__esModule && __m.default) __m = __m.default;\n" +
    "if (!__m || typeof __m !== 'object') {\n" +
    "  __m = {\n" +
    "    clientModules: {},\n" +
    "    ssrModuleMapping: {},\n" +
    "    rscModuleMapping: {},\n" +
    "    edgeRscModuleMapping: {},\n" +
    "  };\n" +
    "}\n" +
    "module.exports = __m;\n" +
    "module.exports.default = __m;\n" +
    "module.exports.__esModule = true;\n";

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
  let fallbackCount = 0;

  for (const targetPath of missing) {
    const candidatePath = stripRouteGroupsFromAppServerPath(targetPath);
    const hasCandidate = candidatePath !== targetPath && fs.existsSync(candidatePath);
    const usedCandidatePath = hasCandidate ? candidatePath : null;

    const didCreate = ensureShimFile(targetPath, usedCandidatePath);
    if (!didCreate) continue;

    createdCount += 1;
    if (!hasCandidate) fallbackCount += 1;
  }

  if (createdCount > 0) {
    console.log(
      `[vercel-fix] Created ${createdCount} shim *_client-reference-manifest.js file(s) to satisfy tracing.`
    );
  }

  if (fallbackCount > 0) {
    console.log(
      `[vercel-fix] ${fallbackCount} shim(s) used a minimal fallback manifest (no candidate found).`
    );
  }
}

main();
