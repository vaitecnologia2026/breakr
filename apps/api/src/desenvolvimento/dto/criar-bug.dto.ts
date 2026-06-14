// DTO de criacao de bug.
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SeveridadeBug } from '@prisma/client';

export class CriarBugDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descricao?: string;

  @IsOptional()
  @IsEnum(SeveridadeBug)
  severidade?: SeveridadeBug;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
