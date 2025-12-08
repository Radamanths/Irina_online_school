import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { QuizzesService } from "./quizzes.service";
import { SubmitQuizAttemptDto } from "./dto/submit-quiz.dto";

@Controller("quizzes")
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get(":quizId")
  async getQuiz(
    @Param("quizId") quizId: string,
    @Headers("x-user-id") userId?: string,
    @Query("locale") locale?: string
  ) {
    if (!quizId) {
      throw new BadRequestException("quizId is required");
    }

    if (!userId) {
      throw new BadRequestException("x-user-id header is required");
    }

    const quiz = await this.quizzesService.getQuiz(quizId, userId, locale);
    if (!quiz) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }
    return quiz;
  }

  @Get(":quizId/submissions")
  async listSubmissions(
    @Param("quizId") quizId: string,
    @Headers("x-user-id") userId?: string,
    @Query("userId") userIdQuery?: string
  ) {
    if (!quizId || !userId) {
      throw new BadRequestException("quizId and x-user-id header are required");
    }

    if (userIdQuery && userIdQuery !== userId) {
      throw new BadRequestException("userId mismatch");
    }

    return this.quizzesService.listSubmissions(quizId, userId);
  }

  @Post(":quizId/submissions")
  submitAttempt(
    @Param("quizId") quizId: string,
    @Body() dto: SubmitQuizAttemptDto,
    @Headers("x-user-id") userId?: string,
    @Query("locale") locale?: string
  ) {
    if (!quizId) {
      throw new BadRequestException("quizId is required");
    }

    if (!userId) {
      throw new BadRequestException("x-user-id header is required");
    }

    if (dto.userId !== userId) {
      throw new BadRequestException("userId mismatch");
    }

    return this.quizzesService.submitAttempt(quizId, dto, locale);
  }
}
