import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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
}
