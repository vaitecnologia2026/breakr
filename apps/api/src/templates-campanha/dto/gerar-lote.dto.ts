// DTOs de preview e geracao em lote (Briefing Marketing — Secao 4).
import { ArrayMinSize, IsArray, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PreviewLoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  clienteIds!: string[];
}

export class GerarLoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  clienteIds!: string[];

  // Nome da campanha gerada (default: nome do template).
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nome?: string;

  // Prazo aplicado a campanha e aos materiais gerados (opcional).
  @IsOptional()
  @IsISO8601()
  prazo?: string;
}
