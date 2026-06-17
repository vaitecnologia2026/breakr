// DTO de atualizacao de meta trimestral.
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AtualizarMetaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @Matches(/^\d{4}-Q[1-4]$/)
  periodo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progresso?: number;

  @IsOptional()
  @IsIn(['EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA'])
  status?: string;
}
