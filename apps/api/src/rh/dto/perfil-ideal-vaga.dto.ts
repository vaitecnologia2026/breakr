// DTO do Perfil Ideal DISC de uma vaga (Job Fit) — percentis 0..100 por dimensão.
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PerfilIdealVagaDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  reqPercD?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  reqPercI?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  reqPercS?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  reqPercC?: number;
}
