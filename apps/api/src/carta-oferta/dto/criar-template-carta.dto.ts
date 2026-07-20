// DTO de criação/edição de modelo de Carta Oferta.
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarTemplateCartaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  assunto?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20000)
  conteudo!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
