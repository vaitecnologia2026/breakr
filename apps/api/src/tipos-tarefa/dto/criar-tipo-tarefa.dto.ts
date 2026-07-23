// DTO de criação de Tipo de Tarefa (template de produção) — Marketing.
// Ao criar, o service semeia as 9 etapas do fluxo (todas aplicáveis, sem responsável).
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ControleEsforco } from '@prisma/client';

export class CriarTipoTarefaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsEnum(ControleEsforco)
  controleEsforco?: ControleEsforco;

  // Dias corridos previstos para concluir (0..3650).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  diasConcluir?: number;

  // Esforço de trabalho previsto, em minutos (0..100000).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  esforcoPrevistoMin?: number;
}
