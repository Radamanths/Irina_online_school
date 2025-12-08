import { Controller, Get, Param } from "@nestjs/common";
import { TranslationsService } from "./translations.service";

@Controller("translations")
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get(":locale")
  async getMessages(@Param("locale") locale: string) {
    const result = await this.translationsService.getMessages(locale);
    return result;
  }
}
