// DTO de criacao de reuniao interna.
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CriarReuniaoDto {
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
  @IsBoolean()
  gerarMeet?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  convidados?: string[];
}
