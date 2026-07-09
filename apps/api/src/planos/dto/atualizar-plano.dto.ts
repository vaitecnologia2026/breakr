// DTO de atualizacao de plano (todos os campos opcionais).
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoProjeto } from '@breakr/shared';

export class AtualizarPlanoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ciclo?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TipoProjeto, { each: true })
  tiposProjeto?: TipoProjeto[];

  @IsOptional()
  entregaveis?: unknown;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // Ids dos produtos que compoem este plano (substitui o vinculo N:N quando enviado).
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  produtoIds?: string[];
}
