// DTO de aprovacao de estrategia pelo cliente no portal (B6). Comentario opcional.
// Importado por portal.controller (POST /portal/:codigo/estrategia/:id/aprovar).
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AprovarEstrategiaDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
