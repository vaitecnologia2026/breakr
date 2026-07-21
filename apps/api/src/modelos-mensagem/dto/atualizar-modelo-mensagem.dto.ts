// DTO de atualização de Modelo de Mensagem — campos opcionais (sem dependências extras).
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AtualizarModeloMensagemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(8000)
  corpo?: string;
}
