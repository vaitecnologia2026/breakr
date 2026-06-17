// DTO de criacao de evento da agenda de onboarding do cliente.
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  // Gera um link do Google Meet para a reuniao.
  @IsOptional()
  @IsBoolean()
  gerarMeet?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  convidados?: string[];
}
