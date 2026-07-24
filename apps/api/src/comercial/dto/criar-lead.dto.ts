// DTO de criacao de lead.
import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  empresa?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  origem?: string;

  @IsOptional()
  @IsNumberString()
  valorEstimado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  // CRM estilo RD: pipeline + etapa (a etapa define o status inicial do funil).
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsOptional()
  @IsUUID()
  etapaId?: string;

  // Previsao de fechamento (ISO). Sem backend antes desta rodada; agora persiste.
  @IsOptional()
  @IsISO8601()
  previsaoFechamento?: string;

  // Ids das etiquetas do negocio.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  etiquetaIds?: string[];
}
