// DTO de criacao de conteudo (peca do funil de producao — M16).
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoConteudo } from '@prisma/client';

export class CriarConteudoDto {
  @IsUUID()
  clienteId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsEnum(TipoConteudo)
  tipo?: TipoConteudo;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @IsUUID()
  squadId?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  // Peca destinada a trafego pago — apos a aprovacao do cliente vai para o
  // laboratorio de criativos (e nao direto para agendamento).
  @IsOptional()
  @IsBoolean()
  paraTrafego?: boolean;

  @IsOptional()
  @IsDateString()
  dataAgendada?: string;
}
