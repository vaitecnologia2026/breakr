// DTO de atualizacao de cliente (todos os campos opcionais).
import { IsArray, IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ClienteStatus } from '@breakr/shared';

// Pilares contratados (Briefing Marketing — Secao 1/2). Espelha o enum TipoProjeto.
const PILARES = ['MARKETING', 'GESTAO', 'FINANCEIRO'] as const;

export class AtualizarClienteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  @IsOptional()
  @IsUUID()
  squadId?: string;

  @IsOptional()
  @IsUUID()
  planoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkAreaMembros?: string;

  @IsOptional()
  @IsArray()
  @IsIn(PILARES, { each: true })
  pilares?: string[];
}
