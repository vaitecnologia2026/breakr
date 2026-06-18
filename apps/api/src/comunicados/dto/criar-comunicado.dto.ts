// DTO de criação de comunicado interno.
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarComunicadoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  corpo!: string;

  @IsOptional()
  @IsBoolean()
  fixado?: boolean;
}
