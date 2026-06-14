// DTO de aprovacao de uma peca pelo cliente (no portal).
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AprovarConteudoDto {
  @IsInt()
  @Min(1)
  @Max(5)
  estrelas!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
