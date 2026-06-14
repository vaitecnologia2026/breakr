// DTO de criacao de candidato.
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarCandidatoDto {
  @IsUUID()
  vagaId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  perfilDisc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;
}
