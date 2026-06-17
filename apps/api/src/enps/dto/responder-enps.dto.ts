// DTO de resposta de eNPS.
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ResponderEnpsDto {
  @IsInt()
  @Min(0)
  @Max(10)
  nota!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}
