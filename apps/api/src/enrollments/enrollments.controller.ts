import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { EnrollmentAccessService } from "./enrollments.service";

@Controller("enrollments")
export class EnrollmentsController {
  constructor(private readonly enrollmentAccessService: EnrollmentAccessService) {}

  @Get("access")
  checkAccess(@Query("userId") userId?: string, @Query("courseId") courseId?: string, @Query("lessonId") lessonId?: string) {
    if (!userId) {
      throw new BadRequestException("userId is required");
    }

    if (!courseId && !lessonId) {
      throw new BadRequestException("courseId or lessonId is required");
    }

    if (courseId) {
      return this.enrollmentAccessService.checkCourseAccess(userId, courseId);
    }

    return this.enrollmentAccessService.checkLessonAccess(userId, lessonId as string);
  }
}
