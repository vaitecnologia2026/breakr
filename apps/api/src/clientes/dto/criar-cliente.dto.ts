// DTO de criacao de cliente.
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CriarClienteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nomeFantasia!: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsUUID()
  planoId?: string;
}
