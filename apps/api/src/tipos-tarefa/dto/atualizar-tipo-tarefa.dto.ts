// DTO de atualização de Tipo de Tarefa — todos os campos opcionais (PATCH parcial).
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

export class AtualizarTipoTarefaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo?: string;

  @IsOptional()
  @IsEnum(ControleEsforco)
  controleEsforco?: ControleEsforco;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  diasConcluir?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  esforcoPrevistoMin?: number;
}
