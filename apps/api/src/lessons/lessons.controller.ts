import { BadRequestException, Controller, Get, Headers, NotFoundException, Param, Query } from "@nestjs/common";
import { LessonsService } from "./lessons.service";

@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  async listLessons(@Query("moduleId") moduleId?: string, @Query("locale") locale?: string) {
    if (!moduleId) {
      throw new BadRequestException("moduleId is required to list lessons");
    }

    return this.lessonsService.listLessons(moduleId, locale);
  }

  @Get(":lessonId")
  async getLesson(
    @Param("lessonId") lessonId: string,
    @Headers("x-user-id") userId?: string,
    @Query("locale") locale?: string
  ) {
    if (!userId) {
      throw new BadRequestException("x-user-id header is required");
    }

    const lesson = await this.lessonsService.getLesson(lessonId, userId, locale);
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    return lesson;
  }
}
