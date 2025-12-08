import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PROGRESS_AUTOMATION_SETTINGS_KEY } from "../admin/constants";

export interface LessonCompletionWebhookPayload {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId: string;
  completedAt: string;
}

export interface ProgressWebhookDeliveryResult {
  delivered: boolean;
  targetUrl: string | null;
}

@Injectable()
export class ProgressWebhookService {
  private readonly logger = new Logger(ProgressWebhookService.name);
  private readonly envWebhookUrl = process.env.PROGRESS_WEBHOOK_URL;
  private readonly cacheTtlMs = 60_000;
  private settingsCache: { url: string | null; enabled: boolean; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async emitLessonCompleted(payload: LessonCompletionWebhookPayload): Promise<ProgressWebhookDeliveryResult> {
    const webhookUrl = await this.resolveWebhookUrl();
    if (!webhookUrl) {
      this.logger.debug("Skipping lesson completion webhook because automation webhook is not configured");
      return { delivered: false, targetUrl: null };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          event: "lesson.completed",
          data: payload
        })
      });

      if (!response.ok) {
        this.logger.warn(`Progress webhook responded with status ${response.status}`);
      }

      return {
        delivered: response.ok,
        targetUrl: webhookUrl
      };
    } catch (error) {
      this.logger.error(
        "Failed to deliver lesson completion webhook",
        error instanceof Error ? error.stack : error
      );
      return {
        delivered: false,
        targetUrl: webhookUrl
      };
    }
  }

  private async resolveWebhookUrl(): Promise<string | null> {
    if (this.envWebhookUrl) {
      return this.envWebhookUrl;
    }

    const now = Date.now();
    if (this.settingsCache && this.settingsCache.expiresAt > now) {
      return this.settingsCache.enabled ? this.settingsCache.url : null;
    }

    try {
      const record = await this.prisma.setting.findUnique({ where: { key: PROGRESS_AUTOMATION_SETTINGS_KEY } });
      const snapshot = this.parseAutomationSettings(record?.value ?? null);
      this.settingsCache = {
        url: snapshot.webhookUrl,
        enabled: snapshot.enabled,
        expiresAt: now + this.cacheTtlMs
      };
      return snapshot.enabled && snapshot.webhookUrl ? snapshot.webhookUrl : null;
    } catch (error) {
      this.logger.warn(
        "Failed to load progress automation settings",
        error instanceof Error ? error.message : error
      );
      this.settingsCache = { url: null, enabled: false, expiresAt: now + this.cacheTtlMs };
      return null;
    }
  }

  private parseAutomationSettings(value: Prisma.JsonValue | null): { webhookUrl: string | null; enabled: boolean } {
    if (!value || typeof value !== "object") {
      return { webhookUrl: null, enabled: false };
    }

    const snapshot = value as Record<string, unknown>;
    const url = typeof snapshot.webhookUrl === "string" ? snapshot.webhookUrl.trim() : "";
    const webhookUrl = url.length ? url : null;
    const enabled = Boolean(snapshot.enabled) && Boolean(webhookUrl);

    return { webhookUrl, enabled };
  }
}
