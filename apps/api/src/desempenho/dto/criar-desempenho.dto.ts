// DTO de criação de avaliação de desempenho.
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CriarDesempenhoDto {
  @IsUUID()
  colaboradorId!: string;

  @IsString()
  @MaxLength(20)
  periodo!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  nota?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  comentario!: string;
}
