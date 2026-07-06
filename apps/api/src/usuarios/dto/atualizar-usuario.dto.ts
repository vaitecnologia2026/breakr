// DTO de atualizacao de usuario. Todos os campos opcionais (ausente = mantem).
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Cargo } from '@prisma/client';

export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsEnum(Cargo)
  cargo?: Cargo;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // Numero de WhatsApp (opcional) usado pelo n8n nos disparos (req. l.140).
  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;
}
