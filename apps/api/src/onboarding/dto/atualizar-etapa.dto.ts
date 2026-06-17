// DTO de atualizacao de uma etapa do onboarding (titulo/descricao/link).
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AtualizarEtapaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}
