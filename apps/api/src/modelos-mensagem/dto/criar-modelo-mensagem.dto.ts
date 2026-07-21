// DTO de criação de Modelo de Mensagem (template de texto) — Marketing.
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarModeloMensagemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(8000)
  corpo!: string;
}
