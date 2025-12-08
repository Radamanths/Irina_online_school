import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ListPlansDto } from "./dto/list-plans.dto";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { SubscriptionsService } from "./subscriptions.service";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get("plans")
  async listPlans(@Query() query: ListPlansDto) {
    const activeOnly = query.active === undefined ? true : query.active.toLowerCase() === "true";

    return this.subscriptionsService.listPlans({
      courseId: query.courseId,
      cohortCode: query.cohortCode,
      activeOnly
    });
  }

  @Post("plans")
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch("plans/:id")
  updatePlan(@Param("id") id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }
}
