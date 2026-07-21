// DTO de criação de Persona (avatar do público-alvo) — Marketing.
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarPersonaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  clienteId?: string;

  // Demografia
  @IsOptional()
  @IsString()
  @MaxLength(20)
  genero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  idade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  relacionamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  classeSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  localizacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  formacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ocupacao?: string;

  // Comportamento
  @IsOptional()
  @IsString()
  @MaxLength(400)
  decisaoCompra?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentarios?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
