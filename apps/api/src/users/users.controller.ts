import { Controller, Get, Param, Query } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id/dashboard")
  getDashboard(@Param("id") userId: string, @Query("locale") locale = "ru") {
    return this.usersService.getDashboard(userId, locale);
  }
}
