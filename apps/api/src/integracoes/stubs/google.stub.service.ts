// STUB do Google Docs/Drive (Fase 0). Loga e devolve doc/pastas fake.
// Impl real (service account via GOOGLE_SERVICE_ACCOUNT_JSON) entra depois —
// ver IntegracoesModule.
import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleDoc,
  GoogleDocDeTemplateInput,
  GooglePastas,
  GooglePastasInput,
  GooglePort,
} from '../ports';
import { fakeId } from './fake.util';

// Subpastas padrao por cliente quando o chamador nao especificar (doc 04).
const SUBPASTAS_PADRAO = ['ideias-materiais', 'design', 'videos', 'gestao'];

@Injectable()
export class GoogleStubService implements GooglePort {
  private readonly logger = new Logger(GoogleStubService.name);

  async gerarDocDeTemplate(
    input: GoogleDocDeTemplateInput,
  ): Promise<GoogleDoc> {
    this.logger.log(
      `[STUB] gerarDocDeTemplate template=${input.templateId} ` +
        `tags=[${Object.keys(input.variaveis).join(', ')}]`,
    );
    const documentId = fakeId('gdoc');
    return {
      documentId,
      linkDocumento: `https://stub.google/doc/${documentId}`,
      linkPdf: `https://stub.google/doc/${documentId}/export.pdf`,
    };
  }

  async criarPastas(input: GooglePastasInput): Promise<GooglePastas> {
    const subpastas = input.subpastas ?? SUBPASTAS_PADRAO;
    this.logger.log(
      `[STUB] criarPastas cliente="${input.nomeCliente}" ` +
        `subpastas=[${subpastas.join(', ')}]`,
    );
    const mapa: Record<string, string> = {};
    for (const nome of subpastas) {
      mapa[nome] = fakeId('gfolder');
    }
    return { pastaRaizId: fakeId('gfolder'), subpastas: mapa };
  }
}
