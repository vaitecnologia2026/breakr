// DTO de criacao/edicao de evento do calendario de Agendamento (Comercial).
import {
  IsBoolean,
  IsDateString,
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CriarAgendamentoDto {
  @IsString()
  @MaxLength(200)
  titulo!: string;

  @IsDateString()
  inicio!: string;

  @IsDateString()
  fim!: string;

  // Controla o icone do card: VIDEO (camera) | PRESENCIAL (pino) | OUTRO.
  @IsOptional()
  @IsIn(['VIDEO', 'PRESENCIAL', 'OUTRO'])
  tipo?: string;

  // Reuniao com cliente (icone destacado no card).
  @IsOptional()
  @IsBoolean()
  comCliente?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  local?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;

  // Cor custom opcional (hex). Se vazia, a tela deriva a cor do colaborador.
  @IsOptional()
  @IsHexColor()
  cor?: string;

  @IsUUID()
  responsavelId!: string;
}
