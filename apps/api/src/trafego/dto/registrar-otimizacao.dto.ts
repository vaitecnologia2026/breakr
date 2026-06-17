// DTO de registro de otimizacao de campanha (historico de tráfego).
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrarOtimizacaoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resultado?: string;
}
