import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import ruFallback from "../../../web/messages/ru.json";
import enFallback from "../../../web/messages/en.json";

type SupportedLocale = "ru" | "en";

type TranslationRow = Prisma.TranslationGetPayload<{
  select: {
    key: true;
    value: true;
  };
}>;

type TranslationResponse = {
  locale: SupportedLocale;
  messages: Record<string, unknown>;
};

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMessages(requestedLocale: string): Promise<TranslationResponse> {
    const locale = this.normalizeLocale(requestedLocale);
    const rows = await this.fetchTranslationRows();

    if (!rows.length) {
      return { locale, messages: this.getFallback(locale) };
    }

    const tree: Record<string, unknown> = {};
    for (const row of rows) {
      const value = this.extractLocalizedValue(row.value, locale);
      if (value === undefined) {
        continue;
      }
      this.assignByPath(tree, row.key, value);
    }

    return { locale, messages: tree };
  }

  private normalizeLocale(locale?: string): SupportedLocale {
    return locale === "en" ? "en" : "ru";
  }

  private async fetchTranslationRows(): Promise<TranslationRow[]> {
    try {
      const delegate = (this.prisma as PrismaService & { translation?: Prisma.TranslationDelegate }).translation;
      if (!delegate) {
        return [];
      }
      return (await delegate.findMany()) as TranslationRow[];
    } catch (error) {
      this.logger.error("Failed to load translations from database", error instanceof Error ? error.stack : error);
      return [];
    }
  }

  private extractLocalizedValue(value: Prisma.JsonValue, locale: SupportedLocale) {
    if (value === null || typeof value !== "object") {
      return undefined;
    }

    const record = value as Record<string, unknown>;
    if (record[locale] !== undefined) {
      return record[locale];
    }

    const fallbackLocale: SupportedLocale = locale === "en" ? "ru" : "en";
    return record[fallbackLocale];
  }

  private assignByPath(tree: Record<string, unknown>, key: string, value: unknown) {
    const segments = key.split(".").filter(Boolean);
    if (!segments.length) {
      return;
    }

    let current: Record<string, unknown> = tree;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (i === segments.length - 1) {
        current[segment] = value;
        return;
      }

      if (typeof current[segment] !== "object" || current[segment] === null) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }
  }

  private getFallback(locale: SupportedLocale) {
    return locale === "en" ? enFallback : ruFallback;
  }
}
