import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PaymentsModule } from "../payments/payments.module";
import { ProgressWebhookService } from "../progress/progress-webhook.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [AdminController],
  providers: [AdminService, ProgressWebhookService]
})
export class AdminModule {}
