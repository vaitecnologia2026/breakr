// Utilitario dos STUBs: gera ids fake plausiveis e legiveis nos logs.
// (randomUUID e nativo do Node — sem dependencia extra.)
import { randomUUID } from 'node:crypto';

export function fakeId(prefixo: string): string {
  return `${prefixo}_${randomUUID().slice(0, 8)}`;
}
