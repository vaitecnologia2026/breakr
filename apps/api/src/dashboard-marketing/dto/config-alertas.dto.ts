// DTO de configuracao dos prazos/alertas do dashboard de marketing (Fatia 10 —
// Secao 6: prazos configuraveis pela coordenadora). Todos opcionais (patch parcial).
import { IsInt, IsOptional, Min } from 'class-validator';

export class ConfigAlertasDto {
  @IsOptional() @IsInt() @Min(1) paradoHoras?: number;
  @IsOptional() @IsInt() @Min(1) criticoHoras?: number;
  @IsOptional() @IsInt() @Min(1) aprovacaoParadaDias?: number;
  @IsOptional() @IsInt() @Min(1) ajusteDias?: number;
  @IsOptional() @IsInt() @Min(1) campanhaSemInicioDias?: number;
  @IsOptional() @IsInt() @Min(1) sobrecargaTarefas?: number;
}
