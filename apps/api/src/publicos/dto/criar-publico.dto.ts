// DTO de criação de Público (planejamento de audiências) — Marketing.
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const TIPOS_SEGMENTACAO = [
  'REMARKETING',
  'SEGUIDORES',
  'SEGMENTADO',
  'NAO_SEGMENTADO',
  'LISTA_EMAIL',
] as const;

export const PRIORIDADES_PUBLICO = [
  'MUITO_ALTA',
  'ALTA',
  'NORMAL',
  'BAIXA',
] as const;

export class CriarPublicoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  clienteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  personaId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tamanho?: number;

  @IsOptional()
  @IsIn(TIPOS_SEGMENTACAO)
  tipoSegmentacao?: (typeof TIPOS_SEGMENTACAO)[number];

  @IsOptional()
  @IsIn(PRIORIDADES_PUBLICO)
  prioridade?: (typeof PRIORIDADES_PUBLICO)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idMeta?: string;

  @IsOptional()
  @IsBoolean()
  importadoMeta?: boolean;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
