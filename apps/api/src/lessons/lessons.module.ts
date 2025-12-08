import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LessonsService } from "./lessons.service";
import { LessonsController } from "./lessons.controller";
import { EnrollmentsModule } from "../enrollments/enrollments.module";

@Module({
  imports: [EnrollmentsModule],
  controllers: [LessonsController],
  providers: [PrismaService, LessonsService],
  exports: [LessonsService]
})
export class LessonsModule {}
