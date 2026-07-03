// DTO de login — validado pelo ValidationPipe global (class-validator).
// O identificador (email) aceita e-mail (admin@breakr.com) OU usuario simples (admin).
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Informe o usuario' })
  @MinLength(3, { message: 'Usuario invalido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres' })
  senha!: string;
}
