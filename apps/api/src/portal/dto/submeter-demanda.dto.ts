import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SubmeterDemandaDto {
  @IsString()
  @MinLength(3)
  titulo: string;

  @IsString()
  @IsIn(['POST', 'REELS', 'STORY', 'CARROSSEL', 'VIDEO', 'ARTIGO'])
  tipo: string;

  @IsString()
  @IsIn(['URGENTE', 'NORMAL', 'PLANEJADO'])
  prioridade: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
