// DTO para salvar as informacoes da empresa que esta sendo onboardada (texto
// livre no checklist do cliente). Opcional/limitado; vazio limpa o campo.
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AtualizarInfoEmpresaDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  infoEmpresa?: string;
}
