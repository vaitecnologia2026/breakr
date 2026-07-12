// DTO de criacao de material (tarefa) de uma campanha de marketing.
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const DESTINOS = ['TRAFEGO_PAGO', 'ORGANICO', 'IMPRESSAO'] as const;

export class CriarMaterialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tipo?: string;

  @IsOptional()
  @IsIn(DESTINOS)
  destino?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsISO8601()
  prazo?: string;
}
