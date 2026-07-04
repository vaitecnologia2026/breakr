// DTOs de pesquisa (survey) do portal do cliente (req. l.44-46).
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarPesquisaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;
}

export class AtualizarPesquisaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
