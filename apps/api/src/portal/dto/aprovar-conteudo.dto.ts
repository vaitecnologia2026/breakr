// DTO de aprovacao de uma peca pelo cliente (no portal).
// estrelas: nota geral (1..5), mantida p/ retrocompat.
// qualidadeGrafica / qualidadeTexto / facilidadeAprovar: avaliacoes dimensionais (M18).
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AprovarConteudoDto {
  @IsInt()
  @Min(1)
  @Max(5)
  estrelas!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  qualidadeGrafica?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  qualidadeTexto?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  facilidadeAprovar?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
