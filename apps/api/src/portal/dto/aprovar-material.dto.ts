// DTO de aprovacao de um material de campanha pelo cliente no portal
// (Briefing Marketing — Secao 9, Modulo 1). comRessalvas = "Aprovar com ressalvas"
// (aprovado com um ajuste menor descrito no comentario).
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AprovarMaterialDto {
  @IsOptional()
  @IsBoolean()
  comRessalvas?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
