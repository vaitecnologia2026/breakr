// DTO de atualizacao de cliente (todos os campos opcionais).
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ClienteStatus } from '@breakr/shared';

export class AtualizarClienteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  @IsOptional()
  @IsUUID()
  squadId?: string;

  @IsOptional()
  @IsUUID()
  planoId?: string;
}
