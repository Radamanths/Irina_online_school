// @ts-nocheck
import http from "node:http";
import https from "node:https";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

type AppLocale = "ru" | "en";

type ContentType = "pages" | "posts";

type WordpressNode = {
  id: number;
  slug: string;
  status?: string;
  type?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  modified?: string;
  modified_gmt?: string;
  date?: string;
  date_gmt?: string;
  meta?: Record<string, unknown>;
  acf?: Record<string, unknown>;
  template?: string;
  link?: string;
  menu_order?: number;
  featured_media?: number;
  yoast_head_json?: {
    title?: string;
    description?: string;
    canonical?: string;
    og_image?: Array<{ url?: string }>;
    twitter_image?: string;
    focuskw?: string;
  };
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
  };
  lang?: string;
  locale?: string;
  polylang_current_lang?: string;
};

type NormalizedEntry = {
  sourceId: number;
  slug: string;
  locale: AppLocale;
  title: string;
  excerpt: string;
  contentHtml: string;
  status: string;
  type: ContentType;
  template?: string;
  menuOrder: number;
  seo: {
    title?: string;
    description?: string;
    canonical?: string;
    focusKeyword?: string;
    previewImage?: string;
  };
  media: {
    featuredImage?: string;
  };
  updatedAt: string;
  sourceLink?: string;
  rawMeta?: Record<string, unknown>;
  rawAcf?: Record<string, unknown>;
};

type CliOptions = {
  source?: string;
  input?: string;
  outputDir: string;
  dryRun: boolean;
  limit?: number;
  contentType: ContentType;
  defaultLocale: AppLocale;
  username?: string;
  password?: string;
  slugPrefix?: string;
};

type MigrationPayload = {
  generatedAt: string;
  source: string;
  total: number;
  locales: Record<AppLocale, NormalizedEntry[]>;
  stats: {
    locales: Record<AppLocale, number>;
    statuses: Record<string, number>;
    templates: Record<string, number>;
  };
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const nodes = await loadWordpressNodes(options);
  const normalized = nodes.slice(0, options.limit ?? nodes.length).map(node => normalizeNode(node, options));
  const payload = buildPayload(normalized, options);

  logSummary(payload);

  if (options.dryRun) {
    return;
  }

  await persistPayload(payload, options.outputDir);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputDir: path.join(process.cwd(), "migrations", "wp"),
    dryRun: false,
    contentType: "pages",
    defaultLocale: "ru"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    switch (key) {
      case "source":
        options.source = argv[++i];
        break;
      case "input":
        options.input = argv[++i];
        break;
      case "output":
        options.outputDir = path.resolve(argv[++i]);
        break;
      case "type":
        options.contentType = (argv[++i] as ContentType) === "posts" ? "posts" : "pages";
        break;
      case "limit": {
        const limit = Number(argv[++i]);
        if (!Number.isNaN(limit)) {
          options.limit = limit;
        }
        break;
      }
      case "dry-run":
        options.dryRun = true;
        break;
      case "default-locale": {
        const locale = argv[++i];
        options.defaultLocale = locale === "en" ? "en" : "ru";
        break;
      }
      case "username":
        options.username = argv[++i];
        break;
      case "password":
        options.password = argv[++i];
        break;
      case "slug-prefix":
        options.slugPrefix = argv[++i];
        break;
      default:
        throw new Error(`Unknown flag --${key}`);
    }
  }

  if (!options.source && !options.input) {
    throw new Error("Provide either --source <wp-site> or --input <path-to-json>");
  }

  return options;
}

async function loadWordpressNodes(options: CliOptions): Promise<WordpressNode[]> {
  if (options.input) {
    const data = await readFile(path.resolve(options.input), "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed as WordpressNode[];
    }
    if (Array.isArray(parsed?.items)) {
      return parsed.items as WordpressNode[];
    }
    throw new Error("Input file must be an array of WordPress nodes");
  }

  return fetchFromSource(options);
}

async function fetchFromSource(options: CliOptions): Promise<WordpressNode[]> {
  if (!options.source) {
    return [];
  }

  const base = options.source.replace(/\/?$/, "");
  const results: WordpressNode[] = [];
  let page = 1;
  const perPage = 100;
  const headers: Record<string, string> = {};

  if (options.username && options.password) {
    const token = Buffer.from(`${options.username}:${options.password}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  while (true) {
    const url = new URL(`${base}/wp-json/wp/v2/${options.contentType}`);
    url.searchParams.set("per_page", perPage.toString());
    url.searchParams.set("page", page.toString());
    url.searchParams.set("status", "publish");
    url.searchParams.set("_embed", "1");

    const { body, status } = await httpRequest(url.toString(), headers);
    if (status >= 400) {
      throw new Error(`WordPress request failed with status ${status}: ${body}`);
    }

    const data = JSON.parse(body) as WordpressNode[];
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    results.push(...data);
    if (data.length < perPage) {
      break;
    }

    page += 1;
    if (options.limit && results.length >= options.limit) {
      break;
    }
  }

  return results;
}

function httpRequest(
  urlString: string,
  headers: Record<string, string>
): Promise<{ body: string; status: number }> {
  const target = new URL(urlString);
  const client = target.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      target,
      { method: "GET", headers },
      res => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });
        res.on("end", () => {
          resolve({ body: Buffer.concat(chunks).toString("utf-8"), status: res.statusCode ?? 0 });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

function normalizeNode(node: WordpressNode, options: CliOptions): NormalizedEntry {
  const locale = inferLocale(node, options.defaultLocale);
  const slug = buildSlug(node.slug || `legacy-${node.id}`, options.slugPrefix);
  return {
    sourceId: node.id,
    slug,
    locale,
    title: decodeHtml(node.title?.rendered ?? ""),
    excerpt: stripHtml(node.excerpt?.rendered ?? ""),
    contentHtml: (node.content?.rendered ?? "").trim(),
    status: node.status ?? "publish",
    type: options.contentType,
    template: node.template || undefined,
    menuOrder: node.menu_order ?? 0,
    seo: extractSeo(node),
    media: extractMedia(node),
    updatedAt: node.modified_gmt || node.modified || node.date_gmt || node.date || new Date().toISOString(),
    sourceLink: node.link,
    rawMeta: node.meta,
    rawAcf: node.acf
  };
}

function inferLocale(node: WordpressNode, fallback: AppLocale): AppLocale {
  const candidate = node.lang || node.locale || node.polylang_current_lang;
  if (candidate === "en") {
    return "en";
  }
  if (candidate === "ru") {
    return "ru";
  }
  if (node.slug?.startsWith("en-")) {
    return "en";
  }
  if (node.slug?.endsWith("-en")) {
    return "en";
  }
  return fallback;
}

function buildSlug(slug: string, prefix?: string) {
  if (!slug) {
    return slug;
  }

  let normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF-]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  normalized = normalized.replace(/^(en|ru)-/, "");
  normalized = normalized.replace(/-(en|ru)$/i, "");

  if (prefix) {
    normalized = `${prefix}-${normalized}`;
  }

  return normalized;
}

function decodeHtml(value: string) {
  return value.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/&amp;/g, "&");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractSeo(node: WordpressNode): NormalizedEntry["seo"] {
  const seo = node.yoast_head_json;
  const ogImage = seo?.og_image?.[0]?.url || seo?.twitter_image;
  return {
    title: seo?.title,
    description: seo?.description,
    canonical: seo?.canonical,
    focusKeyword: seo?.focuskw,
    previewImage: ogImage
  };
}

function extractMedia(node: WordpressNode): NormalizedEntry["media"] {
  const embedded = node._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  return {
    featuredImage: embedded
  };
}

function buildPayload(entries: NormalizedEntry[], options: CliOptions): MigrationPayload {
  const locales: Record<AppLocale, NormalizedEntry[]> = { ru: [], en: [] };
  const localeStats: Record<AppLocale, number> = { ru: 0, en: 0 };
  const statusStats: Record<string, number> = {};
  const templateStats: Record<string, number> = {};

  for (const entry of entries) {
    locales[entry.locale].push(entry);
    localeStats[entry.locale] += 1;
    statusStats[entry.status] = (statusStats[entry.status] || 0) + 1;
    if (entry.template) {
      templateStats[entry.template] = (templateStats[entry.template] || 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: options.source || options.input || "unknown",
    total: entries.length,
    locales,
    stats: {
      locales: localeStats,
      statuses: statusStats,
      templates: templateStats
    }
  };
}

function logSummary(payload: MigrationPayload) {
  /* eslint-disable no-console */
  console.log("\nWP Migration Preview");
  console.log("-------------------");
  console.log(`Entries: ${payload.total}`);
  console.table(payload.stats.locales);
  if (Object.keys(payload.stats.statuses).length) {
    console.log("Status split:");
    console.table(payload.stats.statuses);
  }
  if (Object.keys(payload.stats.templates).length) {
    console.log("Template split:");
    console.table(payload.stats.templates);
  }
  /* eslint-enable no-console */
}

async function persistPayload(payload: MigrationPayload, outputDir: string) {
  await mkdir(outputDir, { recursive: true });
  const target = path.join(outputDir, `wp-export-${Date.now()}.json`);
  await writeFile(target, JSON.stringify(payload, null, 2), "utf-8");
  // eslint-disable-next-line no-console
  console.log(`Saved migration snapshot to ${target}`);
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
