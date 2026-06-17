// DTO de criação/edição de pergunta DISC.
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OpcaoDiscDto {
  @IsString()
  @MaxLength(200)
  texto!: string;

  @IsIn(['D', 'I', 'S', 'C'])
  dimensao!: 'D' | 'I' | 'S' | 'C';
}

export class SalvarPerguntaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  enunciado?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcaoDiscDto)
  opcoes!: OpcaoDiscDto[];
}
