// DTO de atualizacao de estrategia (B6). Importado por estrategia.controller (PATCH /estrategias/:id).
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AtualizarEstrategiaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descricao?: string;
}
