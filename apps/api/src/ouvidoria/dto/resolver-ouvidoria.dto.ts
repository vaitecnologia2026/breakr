// DTO de resolução de manifestação na ouvidoria.
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolverOuvidoriaDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resolucao?: string;

  @IsOptional()
  @IsIn(['ABERTA', 'EM_ANALISE', 'RESOLVIDA'])
  status?: string;
}
