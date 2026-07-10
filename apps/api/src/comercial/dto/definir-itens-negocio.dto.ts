// DTO para definir os planos/produtos de um negocio (Lead) — "+ Produtos".
// Substitui o conjunto atual de itens; o valor do negocio passa a somar tudo.
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class ItemPlanoNegocioDto {
  @IsUUID()
  planoId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantidade?: number;
}

export class ItemProdutoNegocioDto {
  @IsUUID()
  produtoId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantidade?: number;
}

export class DefinirItensNegocioDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPlanoNegocioDto)
  planos?: ItemPlanoNegocioDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemProdutoNegocioDto)
  produtos?: ItemProdutoNegocioDto[];
}
