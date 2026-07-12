// DTO de criacao de campanha de marketing (Briefing Marketing — Secao 3, Planejamento).
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CriarCampanhaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objetivo?: string;

  @IsUUID()
  clienteId!: string;

  @IsOptional()
  @IsUUID()
  squadId?: string;

  @IsOptional()
  @IsISO8601()
  prazo?: string;
}
