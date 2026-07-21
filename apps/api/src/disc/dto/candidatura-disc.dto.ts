// DTO da candidatura pública com teste DISC.
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RespostaDiscDto {
  @IsUUID()
  perguntaId!: string;

  // Compatível com o formato antigo (escolha única). Opcional a partir do
  // modelo ipsativo Most/Least.
  @IsOptional()
  @IsInt()
  @Min(0)
  opcaoIndice?: number;

  // Modelo ipsativo (documento): índice da opção que MAIS descreve o candidato.
  @IsOptional()
  @IsInt()
  @Min(0)
  maisIndice?: number;

  // Modelo ipsativo (documento): índice da opção que MENOS descreve o candidato.
  @IsOptional()
  @IsInt()
  @Min(0)
  menosIndice?: number;
}

export class CandidaturaDiscDto {
  @IsUUID()
  vagaId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  curriculoUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RespostaDiscDto)
  respostas!: RespostaDiscDto[];
}
