import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  roles!: string[];
}
