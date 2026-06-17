// DTO de criação de medalha.
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarMedalhaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descricao?: string;
}
