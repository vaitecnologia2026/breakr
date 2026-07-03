// DTO das notas pessoais do painel do designer (B8). Vazio = limpa as notas.
// Importado por painel-designer.controller (PUT /painel-designer/notas).
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AtualizarNotasDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notas?: string;
}
