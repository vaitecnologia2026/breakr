// DTO de criacao de plano.
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoProjeto } from '@breakr/shared';

export class CriarPlanoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ciclo?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TipoProjeto, { each: true })
  tiposProjeto?: TipoProjeto[];

  // Estrutura livre de entregaveis (JSON).
  @IsOptional()
  entregaveis?: unknown;
}
