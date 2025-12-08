import { Controller, Get, Header } from "@nestjs/common";
import { MonitoringService } from "./monitoring.service";

@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get("health")
  health() {
    return this.monitoringService.healthCheck();
  }

  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  metrics() {
    return this.monitoringService.getMetrics();
  }
}
