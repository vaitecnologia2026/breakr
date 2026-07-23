// DTO de pedido de ajuste (rework) de uma peca pelo cliente. Quando o cliente
// REPROVA, referencia carrega o link/exemplo para a equipe refazer corretamente
// (opcional aqui p/ nao quebrar o fluxo de ajuste ja existente; a obrigatoriedade
// ao reprovar e aplicada no portal).
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AjusteConteudoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  referencia?: string;
}
