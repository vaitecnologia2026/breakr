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

  // Nova senha (opcional). Ausente/vazia = mantem a senha atual. Mesmas regras da
  // criacao: minimo 8 caracteres e maximo 72 bytes (limite do bcrypt).
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha?: string;
}
