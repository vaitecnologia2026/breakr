// DTOs de centro de custo (financeiro interno, req. l.469-476).
import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarCentroCustoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  // Teto de gasto (string numerica p/ preservar precisao — vira Decimal).
  @IsOptional()
  @IsNumberString()
  teto?: string;
}

export class AtualizarCentroCustoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  @IsOptional()
  @IsNumberString()
  teto?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
