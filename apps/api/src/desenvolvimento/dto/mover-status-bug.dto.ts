// DTO de movimentacao de status de bug.
import { IsEnum } from 'class-validator';
import { StatusBug } from '@prisma/client';

export class MoverStatusBugDto {
  @IsEnum(StatusBug)
  status!: StatusBug;
}
