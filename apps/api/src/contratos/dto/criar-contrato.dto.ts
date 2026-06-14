// DTO de criacao de contrato.
import {
  IsBoolean,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CriarContratoDto {
  @IsUUID()
  clienteId!: string;

  // Plano opcional — se ausente, usa o plano do cliente.
  @IsOptional()
  @IsUUID()
  planoId?: string;

  // Valor mensal como string numerica (ex.: "1990.00"); se ausente, usa o
  // valor do plano. Convertido com new Prisma.Decimal no service.
  @IsOptional()
  @IsNumberString()
  valorMensal?: string;

  @IsOptional()
  @IsDateString()
  vencimento?: string;

  @IsOptional()
  @IsBoolean()
  renovacaoAutomatica?: boolean;
}
