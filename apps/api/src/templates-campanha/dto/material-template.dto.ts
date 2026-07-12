// DTOs de material padrao de um template (add/editar).
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

const DESTINOS = ['TRAFEGO_PAGO', 'ORGANICO', 'IMPRESSAO'] as const;

export class CriarTemplateMaterialDto {
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
  @IsInt()
  @Min(0)
  ordem?: number;
}

export class AtualizarTemplateMaterialDto {
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
  @IsInt()
  @Min(0)
  ordem?: number;
}
