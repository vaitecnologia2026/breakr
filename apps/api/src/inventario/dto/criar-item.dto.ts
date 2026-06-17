// DTO de criacao de item de inventario.
import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  @IsOptional()
  @IsNumberString()
  valor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notaFiscalUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  plaqueta?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
