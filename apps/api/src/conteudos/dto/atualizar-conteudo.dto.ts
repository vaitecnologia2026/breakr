// DTO de atualizacao de uma peca de conteudo (edicao das informacoes no card).
// PATCH parcial: todos os campos sao opcionais e apenas os enviados sao gravados.
// Importado por conteudos.controller (PATCH /conteudos/:id).
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoConteudo } from '@prisma/client';

export class AtualizarConteudoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo?: string;

  @IsOptional()
  @IsEnum(TipoConteudo)
  tipo?: TipoConteudo;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  // URL da midia (imagem/video/carrossel) da peca — exibida na aprovacao do cliente.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  midiaUrl?: string;

  @IsOptional()
  @IsBoolean()
  paraTrafego?: boolean;

  // Data/hora de agendamento. Enviar null limpa o agendamento.
  @IsOptional()
  @IsDateString()
  dataAgendada?: string | null;
}
