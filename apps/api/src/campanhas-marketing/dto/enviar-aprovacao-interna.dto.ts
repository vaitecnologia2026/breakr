// DTO para enviar uma campanha a aprovacao interdepartamental (Briefing Marketing —
// Secao 8). pilar = departamento que deve validar (Gestao ou Financeiro).
import { IsIn } from 'class-validator';

export class EnviarAprovacaoInternaDto {
  @IsIn(['GESTAO', 'FINANCEIRO'])
  pilar!: 'GESTAO' | 'FINANCEIRO';
}
