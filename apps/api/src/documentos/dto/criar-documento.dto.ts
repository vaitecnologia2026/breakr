// DTO de criação de documento do colaborador.
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CriarDocumentoDto {
  @IsUUID()
  colaboradorId!: string;

  @IsIn(['HOLERITE', 'FOLHA', 'FOLHA_SALARIAL', 'CARTAO_PONTO', 'FOLHA_PONTO', 'CONTRATO', 'MANUAL', 'OUTRO'])
  tipo!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsString()
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  competencia?: string;
}
