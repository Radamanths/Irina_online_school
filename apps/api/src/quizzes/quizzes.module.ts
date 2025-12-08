import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { QuizzesController } from "./quizzes.controller";
import { QuizzesService } from "./quizzes.service";

@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService]
})
export class QuizzesModule {}
