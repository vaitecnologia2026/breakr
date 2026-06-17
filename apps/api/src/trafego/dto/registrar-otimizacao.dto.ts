// DTO de registro de otimizacao de campanha (historico de tráfego).
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RegistrarOtimizacaoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resultado?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  duracaoMinutos?: number;
}
