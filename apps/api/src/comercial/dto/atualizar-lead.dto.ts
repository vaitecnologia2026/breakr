// DTO de atualizacao de um negocio (Lead) — RESUMO da tela de detalhe.
import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AtualizarLeadDto {
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
  @MaxLength(2000)
  observacao?: string;

  @IsOptional()
  @IsNumberString()
  valorEstimado?: string;

  @IsOptional()
  @IsISO8601()
  previsaoFechamento?: string;

  // Ids das etiquetas do negocio (substitui o conjunto atual).
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  etiquetaIds?: string[];
}
