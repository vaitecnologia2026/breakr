// DTO de atualizacao de material de campanha (status, responsavel, prazo, etc.).
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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

  // Chave da coluna de destino (ColunaMaterial.chave). String p/ aceitar colunas
  // customizadas; a existencia da chave e validada no service (atualizarMaterial).
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  status?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsISO8601()
  prazo?: string;
}
