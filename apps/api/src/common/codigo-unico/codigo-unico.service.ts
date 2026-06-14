import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * Gera codigos unicos curtos e legiveis, anexados ao nome de entidades de
 * trabalho (campanha, publico, contrato, tarefa...) para rastreabilidade
 * sistema <-> Meta Ads <-> documentos — ver docs/escopo/02 e 03.
 *
 * Formato: [PREFIXO-]<base36 do tempo><aleatorio>. Ex.: "CP-LZ4K9A7F3".
 * A combinacao tempo + aleatorio torna colisao praticamente impossivel; mesmo
 * assim, persista sempre em coluna @unique e trate o erro de duplicidade.
 */
@Injectable()
export class CodigoUnicoService {
  gerar(prefixo = ''): string {
    const tempo = Date.now().toString(36).toUpperCase();
    const aleatorio = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    const base = `${tempo}${aleatorio}`;
    return prefixo ? `${prefixo.toUpperCase()}-${base}` : base;
  }
}
