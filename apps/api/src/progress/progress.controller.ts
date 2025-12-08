import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Res } from "@nestjs/common";
import { ProgressService } from "./progress.service";
import { UpsertProgressDto } from "./dto/upsert-progress.dto";
import type { Response } from "express";

@Controller("progress")
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get(":userId")
  getProgress(@Param("userId") userId: string, @Query("courseId") courseId?: string) {
    return this.progressService.listProgress(userId, courseId);
  }

  @Get("export/course/:courseId")
  async exportCourseProgress(
    @Param("courseId") courseId: string,
    @Query("format") format?: string,
    @Query("locale") locale?: string,
    @Res({ passthrough: true }) res?: Response
  ) {
    if (!courseId) {
      throw new BadRequestException("courseId is required");
    }

    const rows = await this.progressService.exportCourseProgress(courseId, locale);
    if ((format ?? "json").toLowerCase() === "csv") {
      if (res) {
        res.setHeader("content-type", "text/csv; charset=utf-8");
        res.setHeader("content-disposition", `attachment; filename=course-${courseId}-progress.csv`);
      }
      return this.progressService.serializeProgressCsv(rows);
    }

    return rows;
  }

  @Patch()
  updateProgress(@Body() dto: UpsertProgressDto) {
    return this.progressService.upsertProgress(dto);
  }
}
