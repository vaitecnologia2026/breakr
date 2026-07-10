// DTO de criacao de nota de um negocio (aba "Notas" da tela de detalhe).
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CriarNotaLeadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  texto!: string;
}
