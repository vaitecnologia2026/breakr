// DTO de pedido de ajuste (rework) de uma peca pelo cliente.
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AjusteConteudoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario!: string;
}
