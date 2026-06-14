import { IsEnum } from 'class-validator';
import { StatusCampanha } from '@prisma/client';

export class MoverStatusCampanhaDto {
  @IsEnum(StatusCampanha)
  status!: StatusCampanha;
}
