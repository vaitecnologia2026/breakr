// DTO de geração de Carta Oferta para um candidato a partir de um modelo.
import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class GerarCartaDto {
  @IsUUID()
  candidatoId!: string;

  @IsUUID()
  templateId!: string;

  // Mapa { campo: valor } com os valores das variáveis {{campo}} do modelo.
  @IsOptional()
  @IsObject()
  valores?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;
}
