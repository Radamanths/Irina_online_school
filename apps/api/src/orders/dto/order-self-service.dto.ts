import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export enum OrderSelfServiceAction {
  Cancel = "cancel",
  Refund = "refund"
}

export class OrderSelfServiceRequestDto {
  @IsString()
  userId!: string;

  @IsEnum(OrderSelfServiceAction)
  action!: OrderSelfServiceAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}
