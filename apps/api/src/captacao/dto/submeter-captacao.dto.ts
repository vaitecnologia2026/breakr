// DTO do formulário público de captação de dados (jurídico).
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmeterCaptacaoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nomeFantasia!: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @IsUUID()
  planoId!: string;
}
