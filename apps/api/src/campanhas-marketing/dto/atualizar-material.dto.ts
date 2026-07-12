// DTO de atualizacao de material de campanha (status, responsavel, prazo, etc.).
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { StatusMaterial } from '@prisma/client';

const DESTINOS = ['TRAFEGO_PAGO', 'ORGANICO', 'IMPRESSAO'] as const;

export class AtualizarMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tipo?: string;

  @IsOptional()
  @IsIn(DESTINOS)
  destino?: string;

  @IsOptional()
  @IsEnum(StatusMaterial)
  status?: StatusMaterial;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsISO8601()
  prazo?: string;
}
