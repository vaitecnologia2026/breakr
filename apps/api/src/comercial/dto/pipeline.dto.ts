// DTOs de pipelines, etapas e etiquetas do CRM.
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StatusLead } from '@prisma/client';

export class MoverEtapaLeadDto {
  @IsUUID()
  etapaId!: string;
}

export class EtapaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nome!: string;

  @IsEnum(StatusLead)
  status!: StatusLead;

  @IsOptional()
  @IsInt()
  ordem?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  metaDias?: number;
}

export class CriarPipelineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtapaDto)
  etapas?: EtapaDto[];
}

export class AtualizarPipelineDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsInt()
  ordem?: number;
}

export class AtualizarEtapaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsEnum(StatusLead)
  status?: StatusLead;

  @IsOptional()
  @IsInt()
  ordem?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  metaDias?: number;
}

export class ReordenarEtapasDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class CriarEtiquetaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cor?: string;
}
