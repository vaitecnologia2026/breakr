import { IsInt, IsNumberString, IsOptional, Min } from 'class-validator';

export class AtualizarMetricasDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  impressoes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cliques?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  conversoes?: number;

  @IsOptional()
  @IsNumberString()
  gasto?: string;
}
