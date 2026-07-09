// DTO de criacao de produto.
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CriarProdutoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;
}
