import { Controller, Get, Param, Query } from "@nestjs/common";
import { CoursesService } from "./courses.service";

@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll(@Query("locale") locale = "ru") {
    return this.coursesService.listCourses(locale);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string, @Query("locale") locale = "ru") {
    return this.coursesService.getCourseDetail(slug, locale);
  }
}
