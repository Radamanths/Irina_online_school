import { Injectable } from "@nestjs/common";
import { getAppConfig } from "@virgo/config";
import type { AppConfig } from "@virgo/config";

@Injectable()
export class AppService {
  private readonly config: AppConfig = getAppConfig();

  getHealth() {
    return {
      status: "ok",
      apiBase: this.config.apiBaseUrl,
      frontendBase: this.config.frontendBaseUrl
    };
  }
}
