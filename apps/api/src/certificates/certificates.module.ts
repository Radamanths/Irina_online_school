import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CertificatesService } from "./certificates.service";
import { CertificatesController } from "./certificates.controller";

@Module({
  controllers: [CertificatesController],
  providers: [PrismaService, CertificatesService],
  exports: [CertificatesService]
})
export class CertificatesModule {}
