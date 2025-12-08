import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import { IssueCertificateDto } from "./dto/issue-certificate.dto";

@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get("user/:userId")
  async listUserCertificates(@Param("userId") userId: string, @Query("locale") locale?: string) {
    if (!userId) {
      throw new BadRequestException("userId is required");
    }

    return this.certificatesService.listUserCertificates(userId, locale);
  }

  @Get("enrollment/:enrollmentId")
  async getByEnrollment(@Param("enrollmentId") enrollmentId: string, @Query("locale") locale?: string) {
    const certificate = await this.certificatesService.getByEnrollment(enrollmentId, locale);
    if (!certificate) {
      throw new NotFoundException(`Certificate for enrollment ${enrollmentId} not found`);
    }
    return certificate;
  }

  @Get("verify/:hash")
  async verifyCertificate(@Param("hash") hash: string, @Query("locale") locale?: string) {
    const certificate = await this.certificatesService.verifyByHash(hash, locale);
    if (!certificate) {
      throw new NotFoundException(`Certificate with hash ${hash} not found`);
    }
    return certificate;
  }

  @Post()
  issueCertificate(@Body() dto: IssueCertificateDto, @Query("locale") locale?: string) {
    return this.certificatesService.issueCertificate(dto, locale);
  }
}
