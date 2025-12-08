import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import { ModulesService } from "./modules.service";

@Controller("modules")
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  async getModules(@Query("courseId") courseId?: string, @Query("locale") locale?: string) {
    if (!courseId) {
      throw new BadRequestException("courseId is required to list modules");
    }

    return this.modulesService.listModules(courseId, locale);
  }

  @Get(":moduleId")
  async getModule(@Param("moduleId") moduleId: string, @Query("locale") locale?: string) {
    const module = await this.modulesService.getModule(moduleId, locale);
    if (!module) {
      throw new BadRequestException(`Module ${moduleId} not found`);
    }
    return module;
  }
}
