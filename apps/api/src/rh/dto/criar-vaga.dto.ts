// DTO de criacao de vaga.
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarVagaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  departamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;
}
