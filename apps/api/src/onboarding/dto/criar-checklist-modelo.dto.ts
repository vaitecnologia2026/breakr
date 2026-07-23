// DTO para criar um modelo (template) de checklist de onboarding: um nome e a
// lista de itens (titulos). Reutilizavel — a CS cria varios modelos e depois os
// aplica ao onboarding de cada cliente.
import {
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarChecklistModeloDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nome!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  itens!: string[];
}
