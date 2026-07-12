// DTO de atualizacao de campanha de marketing (todos opcionais).
import { IsISO8601, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const SITUACOES = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA'] as const;

export class AtualizarCampanhaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objetivo?: string;

  @IsOptional()
  @IsIn(SITUACOES)
  situacao?: string;

  @IsOptional()
  @IsUUID()
  squadId?: string;

  @IsOptional()
  @IsISO8601()
  prazo?: string;
}
