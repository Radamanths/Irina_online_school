import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ListOrdersDto } from "./dto/list-orders.dto";
import { OrderSelfServiceRequestDto } from "./dto/order-self-service.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get(":id")
  getOne(@Param("id") orderId: string) {
    return this.ordersService.getOrder(orderId);
  }

  @Get()
  list(@Query() query: ListOrdersDto) {
    return this.ordersService.listOrders(query);
  }

  @Get("user/:userId")
  listForUser(@Param("userId") userId: string, @Query() query: ListOrdersDto) {
    return this.ordersService.listOrders({ ...query, userId });
  }

  @Post(":id/self-service")
  requestSelfServiceAction(@Param("id") orderId: string, @Body() dto: OrderSelfServiceRequestDto) {
    return this.ordersService.requestSelfServiceAction(orderId, dto);
  }
}
