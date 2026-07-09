import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { StatusAtividade, TipoAtividade } from '@prisma/client';

// Payload para atualizar uma atividade comercial (editar / concluir).
export class AtualizarAtividadeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsEnum(TipoAtividade)
  tipo?: TipoAtividade;

  @IsOptional()
  @IsEnum(StatusAtividade)
  status?: StatusAtividade;

  @IsOptional()
  @IsISO8601()
  vencimento?: string;

  @IsOptional()
  @IsISO8601()
  horaFim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contato?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
