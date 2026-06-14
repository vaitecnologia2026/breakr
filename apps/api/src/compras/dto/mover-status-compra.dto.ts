// DTO para mover a solicitacao de compra de status.
import { IsEnum } from 'class-validator';
import { StatusCompra } from '@prisma/client';

export class MoverStatusCompraDto {
  @IsEnum(StatusCompra)
  status!: StatusCompra;
}
