// DTO de mudanca de status no funil de producao.
import { IsEnum } from 'class-validator';
import { StatusConteudo } from '@prisma/client';

export class MoverStatusDto {
  @IsEnum(StatusConteudo)
  status!: StatusConteudo;
}
