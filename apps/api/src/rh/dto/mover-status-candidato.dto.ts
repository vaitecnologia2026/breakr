// DTO de mudanca de status do candidato no funil de recrutamento.
import { IsEnum } from 'class-validator';
import { StatusCandidato } from '@prisma/client';

export class MoverStatusCandidatoDto {
  @IsEnum(StatusCandidato)
  status!: StatusCandidato;
}
