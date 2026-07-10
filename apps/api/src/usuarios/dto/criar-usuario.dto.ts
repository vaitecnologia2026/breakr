// DTO de criacao de usuario (validado em runtime pelo ValidationPipe global).
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Cargo } from '@prisma/client';

export class CriarUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite de bytes do bcrypt
  senha!: string;

  @IsEnum(Cargo)
  cargo!: Cargo;

  // Numero de WhatsApp (opcional) usado pelo n8n nos disparos (req. l.140).
  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  // Perfil de acesso (opcional) — define quais menus/telas o usuario ve.
  @IsOptional()
  @IsUUID()
  perfilId?: string;
}
