// DTO de reprovacao de um material de campanha pelo cliente no portal
// (Briefing Marketing — Secao 9, Modulo 1). Ao reprovar, o comentario e
// OBRIGATORIO (o material volta para ajuste com o feedback do cliente).
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReprovarMaterialDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario!: string;
}
