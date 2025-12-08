import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProgressService } from "./progress.service";
import { ProgressController } from "./progress.controller";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { ProgressWebhookService } from "./progress-webhook.service";

@Module({
  imports: [EnrollmentsModule],
  controllers: [ProgressController],
  providers: [PrismaService, ProgressService, ProgressWebhookService]
})
export class ProgressModule {}
