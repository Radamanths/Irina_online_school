import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EnrollmentsController } from "./enrollments.controller";
import { EnrollmentAccessService } from "./enrollments.service";

@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentAccessService],
  exports: [EnrollmentAccessService]
})
export class EnrollmentsModule {}
