// DTO de atualizacao de coluna do board (rotulo/ordem/oculta).
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class AtualizarColunaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  rotulo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  oculta?: boolean;
}
