// DTO da config do portal do cliente. Campo opcional: ausente = mantem;
// string vazia = limpa a frase.
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AtualizarPortalDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  fraseMotivacional?: string;
}
