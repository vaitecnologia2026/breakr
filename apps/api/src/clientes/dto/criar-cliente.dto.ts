// DTO de criacao de cliente.
import { IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Pilares contratados (Briefing Marketing — Secao 1/2). Espelha o enum TipoProjeto.
const PILARES = ['MARKETING', 'GESTAO', 'FINANCEIRO'] as const;

export class CriarClienteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nomeFantasia!: string;

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
  @IsUUID()
  planoId?: string;

  @IsOptional()
  @IsUUID()
  squadId?: string;

  @IsOptional()
  @IsArray()
  @IsIn(PILARES, { each: true })
  pilares?: string[];
}
