// DTO de solicitacao de criativo (gestor de trafego -> estrategista).
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SolicitarCriativoDto {
  @IsUUID()
  clienteId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;
}
