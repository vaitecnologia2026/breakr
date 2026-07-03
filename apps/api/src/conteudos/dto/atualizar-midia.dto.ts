// DTO para anexar/atualizar a URL da midia de uma peca (B5). Vazio = limpa a midia.
// Importado por conteudos.controller (PATCH /conteudos/:id/midia).
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AtualizarMidiaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  midiaUrl?: string;
}
