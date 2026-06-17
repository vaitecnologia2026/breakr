// DTO de criacao de solicitacao de compra.
import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarCompraDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  descricao!: string;

  // Opcional: uma solicitação de material pode não ter valor (ex.: item de estoque).
  @IsOptional()
  @IsNumberString()
  valor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fornecedor?: string;

  @IsOptional()
  @IsUUID()
  solicitanteId?: string;
}
