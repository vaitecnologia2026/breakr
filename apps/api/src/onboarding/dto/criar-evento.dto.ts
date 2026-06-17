// DTO de criacao de evento da agenda de onboarding do cliente.
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CriarEventoDto {
  @IsString()
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsDateString()
  data!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  oQueLevar?: string;
}
