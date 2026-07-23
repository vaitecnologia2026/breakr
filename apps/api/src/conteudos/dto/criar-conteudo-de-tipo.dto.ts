// DTO para criar uma peca (Conteudo) a partir de um Tipo de Tarefa (o "elo" do
// catalogo Tipos de Tarefa x Etapas com o funil de producao). O tipo de origem
// vem na rota (:tipoId); aqui so precisamos do cliente e, opcionalmente, de um
// titulo que sobrescreve o titulo do tipo.
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CriarConteudoDeTipoDto {
  @IsUUID()
  clienteId!: string;

  // Titulo da peca. Quando omitido, usa o titulo do Tipo de Tarefa.
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo?: string;
}
