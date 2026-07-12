// DTO da decisao do departamento na aprovacao interdepartamental (Briefing Marketing
// — Secao 8): dar aval, sugerir ajuste ou reprovar. Comentario opcional (recomendado
// ao sugerir ajuste/reprovar).
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecidirAprovacaoInternaDto {
  @IsIn(['APROVAR', 'AJUSTE', 'REPROVAR'])
  decisao!: 'APROVAR' | 'AJUSTE' | 'REPROVAR';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
