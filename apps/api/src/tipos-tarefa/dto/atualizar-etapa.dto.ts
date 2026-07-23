// DTO para configurar UMA etapa da matriz de um Tipo de Tarefa:
// - aplicavel: se a etapa faz parte do fluxo daquele tipo ("–" = false)
// - responsavelId: responsável padrão da etapa (null/"" limpa a atribuição)
import { IsBoolean, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { EtapaTipoTarefa } from '@prisma/client';

export class AtualizarEtapaDto {
  @IsEnum(EtapaTipoTarefa)
  etapa!: EtapaTipoTarefa;

  @IsOptional()
  @IsBoolean()
  aplicavel?: boolean;

  // Aceita string (id do usuário) ou null (para limpar o responsável).
  @IsOptional()
  @ValidateIf((o) => o.responsavelId !== null)
  @IsString()
  responsavelId?: string | null;
}
