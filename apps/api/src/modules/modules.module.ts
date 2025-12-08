import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ModulesService } from "./modules.service";
import { ModulesController } from "./modules.controller";

@Module({
  controllers: [ModulesController],
  providers: [PrismaService, ModulesService],
  exports: [ModulesService]
})
export class ModulesModule {}
