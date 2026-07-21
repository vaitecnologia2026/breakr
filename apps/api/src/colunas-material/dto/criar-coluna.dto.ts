// DTO de criacao de coluna do board de Campanhas de Marketing (coluna customizada).
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CriarColunaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  rotulo!: string;
}
