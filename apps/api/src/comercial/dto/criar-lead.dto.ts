// DTO de criacao de lead.
import {
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  empresa?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  origem?: string;

  @IsOptional()
  @IsNumberString()
  valorEstimado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
