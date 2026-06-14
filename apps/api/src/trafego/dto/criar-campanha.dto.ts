import { IsNumberString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CriarCampanhaDto {
  @IsUUID()
  clienteId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  objetivo?: string;

  @IsOptional()
  @IsNumberString()
  orcamentoDiario?: string;
}
