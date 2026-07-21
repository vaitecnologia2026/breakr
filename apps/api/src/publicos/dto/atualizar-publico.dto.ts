// DTO de atualização de Público — todos os campos opcionais (sem dependências extras).
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
import { PRIORIDADES_PUBLICO, TIPOS_SEGMENTACAO } from './criar-publico.dto';

export class AtualizarPublicoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome?: string;

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
