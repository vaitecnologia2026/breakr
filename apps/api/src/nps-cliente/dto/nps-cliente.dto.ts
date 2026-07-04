// DTO de registro de NPS de cliente (req. l.196-198, 544-547).
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class RegistrarNpsDto {
  @IsUUID()
  clienteId!: string;

  @IsInt()
  @Min(0)
  @Max(10)
  nota!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;
}
