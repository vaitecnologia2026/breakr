import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { TipoAtividade } from '@prisma/client';

// Payload para criar uma atividade comercial (tela "Atividades" do CRM).
export class CriarAtividadeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titulo!: string;

  @IsOptional()
  @IsEnum(TipoAtividade)
  tipo?: TipoAtividade;

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
  @IsString()
  @MaxLength(200)
  empresaNome?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
