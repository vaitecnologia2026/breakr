// DTO de mudança de status de uma Carta Oferta.
import { IsEnum } from 'class-validator';
import { StatusCartaOferta } from '@prisma/client';

export class AtualizarStatusCartaDto {
  @IsEnum(StatusCartaOferta)
  status!: StatusCartaOferta;
}
