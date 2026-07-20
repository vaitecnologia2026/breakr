// DTO de prévia (não persiste) de uma Carta Oferta enquanto o usuário edita.
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PreviaCartaDto {
  @IsString()
  @MaxLength(20000)
  conteudo!: string;

  @IsOptional()
  @IsObject()
  valores?: Record<string, string>;
}
