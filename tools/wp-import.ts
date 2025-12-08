// @ts-nocheck
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient, Prisma } from "@prisma/client";

type AppLocale = "ru" | "en";

type CliOptions = {
  input: string;
  dryRun: boolean;
  locale?: AppLocale;
};

type NormalizedEntry = {
  sourceId: number;
  slug: string;
  locale: AppLocale;
  title: string;
  excerpt: string;
  contentHtml: string;
  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
    focusKeyword?: string;
  };
};

type MigrationPayload = {
  locales: Record<AppLocale, NormalizedEntry[]>;
};

type LocaleRecord = Partial<Record<AppLocale, string>>;

type TranslationMap = Map<string, LocaleRecord>;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const payload = await loadPayload(options.input);
  const localesToImport: AppLocale[] = options.locale ? [options.locale] : ["ru", "en"];
  const translationMap = buildTranslationMap(payload, localesToImport);

  logSummary(translationMap, options);

  if (options.dryRun) {
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const [key, value] of translationMap.entries()) {
      await prisma.translation.upsert({
        where: { key },
        update: { value: value as Prisma.JsonValue },
        create: { key, value: value as Prisma.JsonValue }
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { input: "", dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const flag = arg.slice(2);
    switch (flag) {
      case "input":
        options.input = argv[++i] || "";
        break;
      case "dry-run":
        options.dryRun = true;
        break;
      case "locale": {
        const locale = argv[++i];
        if (locale === "en" || locale === "ru") {
          options.locale = locale;
        }
        break;
      }
      default:
        throw new Error(`Unknown flag --${flag}`);
    }
  }

  if (!options.input) {
    throw new Error("Provide --input <path-to-wp-export.json>");
  }

  return options;
}

async function loadPayload(inputPath: string): Promise<MigrationPayload> {
  const absolute = path.resolve(process.cwd(), inputPath);
  const raw = await readFile(absolute, "utf-8");
  const data = JSON.parse(raw);
  if (!data?.locales) {
    throw new Error("Invalid migration payload: missing locales property");
  }
  return data as MigrationPayload;
}

function buildTranslationMap(payload: MigrationPayload, locales: AppLocale[]): TranslationMap {
  const map: TranslationMap = new Map();

  for (const locale of locales) {
    const entries = payload.locales[locale] || [];
    for (const entry of entries) {
      const slug = normalizeSlug(entry.slug || `legacy-${entry.sourceId}`);
      const baseKey = `pages.${slug}`;

      setValue(map, `${baseKey}.title`, locale, entry.title);
      setValue(map, `${baseKey}.excerpt`, locale, entry.excerpt);
      setValue(map, `${baseKey}.content`, locale, entry.contentHtml);
      setValue(map, `${baseKey}.seo.title`, locale, entry.seo?.title);
      setValue(map, `${baseKey}.seo.description`, locale, entry.seo?.description);
      setValue(map, `${baseKey}.seo.canonical`, locale, entry.seo?.canonical);
      setValue(map, `${baseKey}.seo.focusKeyword`, locale, entry.seo?.focusKeyword);
    }
  }

  return map;
}

function normalizeSlug(slug: string) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function setValue(map: TranslationMap, key: string, locale: AppLocale, value?: string) {
  if (!value) {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  if (!map.has(key)) {
    map.set(key, {});
  }
  const record = map.get(key)!;
  record[locale] = trimmed;
}

function logSummary(map: TranslationMap, options: CliOptions) {
  const locales = options.locale ? [options.locale] : ["ru", "en"];
  const stats: Record<AppLocale, number> = { ru: 0, en: 0 };
  for (const record of map.values()) {
    for (const locale of locales) {
      if (record[locale]) {
        stats[locale] += 1;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("WP Import Summary");
  // eslint-disable-next-line no-console
  console.log(`Keys ready: ${map.size}`);
  // eslint-disable-next-line no-console
  console.table(stats);

  if (options.dryRun) {
    // eslint-disable-next-line no-console
    console.log("Dry run enabled — skipping database writes");
  }
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
