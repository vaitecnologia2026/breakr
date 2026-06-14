// DTO para mover o lead de etapa no pipeline.
import { IsEnum } from 'class-validator';
import { StatusLead } from '@prisma/client';

export class MoverStatusLeadDto {
  @IsEnum(StatusLead)
  status!: StatusLead;
}
