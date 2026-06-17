// DTO de criação de conta a pagar.
import { IsDateString, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarContaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  @IsNumberString()
  valor!: string;

  @IsDateString()
  vencimento!: string;
}
