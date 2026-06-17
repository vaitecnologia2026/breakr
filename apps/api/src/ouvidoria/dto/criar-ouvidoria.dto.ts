// DTO de criacao de manifestacao na ouvidoria.
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarOuvidoriaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  assunto!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  mensagem!: string;

  @IsOptional()
  @IsBoolean()
  anonima?: boolean;
}
