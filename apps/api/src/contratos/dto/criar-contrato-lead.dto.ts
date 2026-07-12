// DTO de criacao de contrato a partir do negocio (Lead) — "Criar Contrato".
// Alem do tipo (COM/SEM Marketing), coleta os campos comerciais que viram tags
// no .docx (duracao, desconto, forma de pagamento, dia, data de assinatura).
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CriarContratoLeadDto {
  @IsIn(['COM_MARKETING', 'SEM_MARKETING'])
  tipo!: 'COM_MARKETING' | 'SEM_MARKETING';

  @IsOptional() @IsInt() @IsIn([3, 6, 12])
  duracaoMeses?: number;

  @IsOptional() @IsInt() @IsIn([0, 10, 20, 30])
  descontoPct?: number;

  // Forma de pagamento da cobranca no Asaas. Mantem BOLETO_PIX (legado) e adiciona
  // as 3 opcoes explicitas do fluxo "Criar Contrato": Cartao, PIX e Boleto.
  @IsOptional() @IsIn(['BOLETO_PIX', 'CARTAO', 'PIX', 'BOLETO'])
  formaPagamento?: 'BOLETO_PIX' | 'CARTAO' | 'PIX' | 'BOLETO';

  @IsOptional() @IsInt() @Min(1) @Max(31)
  diaPagamento?: number;

  @IsOptional() @IsDateString()
  dataAssinatura?: string;

  // Plano p/ valor mensal; se ausente usa o valor do negocio (soma dos itens).
  @IsOptional() @IsUUID()
  planoId?: string;

  @IsOptional() @IsNumberString()
  valorMensal?: string;
}
