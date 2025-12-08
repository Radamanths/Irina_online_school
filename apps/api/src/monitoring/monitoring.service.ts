import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Gauge, Registry, collectDefaultMetrics } from "prom-client";
import { performance } from "node:perf_hooks";
import { PrismaService } from "../prisma/prisma.service";

export type ComponentStatus = "ok" | "degraded" | "error";

export interface ServiceStatus {
  status: ComponentStatus;
  detail?: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: ComponentStatus;
  services: {
    database: ServiceStatus;
    storage: ServiceStatus;
  };
  uptimeSeconds: number;
  timestamp: string;
  version: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly registry = new Registry();
  private readonly uptimeGauge: Gauge;
  private readonly healthGauge: Gauge;
  private readonly version: string;

  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
    collectDefaultMetrics({ register: this.registry });

    this.version = this.configService.get<string>("APP_VERSION") ?? "0.1.0";

    this.uptimeGauge = new Gauge({
      name: "virgo_api_uptime_seconds",
      help: "Node.js process uptime in seconds",
      registers: [this.registry]
    });

    this.healthGauge = new Gauge({
      name: "virgo_api_health_status",
      help: "Service health indicator (2=ok, 1=degraded, 0=error)",
      registers: [this.registry]
    });
  }

  async getMetrics(): Promise<string> {
    this.uptimeGauge.set(process.uptime());
    return this.registry.metrics();
  }

  async healthCheck(): Promise<HealthReport> {
    const database = await this.checkDatabase();
    const storage = this.checkStorage();
    const overall = this.pickOverallStatus([database.status, storage.status]);
    this.healthGauge.set(this.toNumericStatus(overall));

    return {
      status: overall,
      services: { database, storage },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      version: this.version
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const started = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = performance.now() - started;
      return { status: "ok", latencyMs };
    } catch (error) {
      const latencyMs = performance.now() - started;
      this.logger.error("Database ping failed", error instanceof Error ? error.stack : error);
      return { status: "error", latencyMs, detail: "Prisma connection failed" };
    }
  }

  private checkStorage(): ServiceStatus {
    const bucket = this.configService.get<string>("AWS_S3_BUCKET");
    const region = this.configService.get<string>("AWS_REGION") ?? this.configService.get<string>("AWS_S3_REGION");
    const accessKey = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretKey = this.configService.get<string>("AWS_SECRET_ACCESS_KEY");

    if (bucket && region && accessKey && secretKey) {
      return { status: "ok", detail: `${bucket} (${region})` };
    }

    if (bucket) {
      return { status: "degraded", detail: `${bucket} (missing credentials or region)` };
    }

    return { status: "degraded", detail: "AWS_S3_BUCKET is not configured" };
  }

  private pickOverallStatus(statuses: ComponentStatus[]): ComponentStatus {
    if (statuses.includes("error")) {
      return "error";
    }
    if (statuses.includes("degraded")) {
      return "degraded";
    }
    return "ok";
  }

  private toNumericStatus(status: ComponentStatus): number {
    switch (status) {
      case "ok":
        return 2;
      case "degraded":
        return 1;
      default:
        return 0;
    }
  }
}
