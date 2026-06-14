// DTO de atribuicao de responsavel por uma peca de conteudo.
import { IsUUID } from 'class-validator';

export class AtribuirResponsavelDto {
  @IsUUID()
  responsavelId!: string;
}
