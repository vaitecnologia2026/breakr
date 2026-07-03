// DTO de criacao de estrategia (B6). Importado por estrategia.controller (POST /estrategias).
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CriarEstrategiaDto {
  @IsUUID()
  clienteId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descricao?: string;
}
