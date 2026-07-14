// DTO para definir o acesso do cliente ao portal (tela "Usuarios").
// - usuario: pode ser um e-mail OU um nome de usuario (nao forcamos formato de e-mail).
// - senha: boas praticas — minimo 8 caracteres, com ao menos uma letra e um numero;
//   caracteres especiais sao permitidos, porem NAO obrigatorios (conforme solicitado).
//   Maximo 72 bytes (limite do bcrypt), mesmo padrao do cadastro de usuarios internos.
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DefinirAcessoPortalDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  usuario!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve ter no minimo 8 caracteres, com ao menos uma letra e um numero.',
  })
  senha!: string;
}
