// DTO de login — validado pelo ValidationPipe global (class-validator).
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail invalido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres' })
  senha!: string;
}
