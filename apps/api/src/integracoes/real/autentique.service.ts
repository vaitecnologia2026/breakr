// Adapter real do Autentique (assinatura eletrônica) via GraphQL.
// Ativa quando AUTENTIQUE_TOKEN estiver no ambiente.
// Ref: https://docs.autentique.com.br/api/graphql
import { Injectable, Logger } from '@nestjs/common';
import { AutentiqueAssinaturaInput, AutentiqueDocumento, AutentiquePort } from '../ports';

const ENDPOINT = 'https://api.autentique.com.br/2/graphql';

@Injectable()
export class AutentiqueService implements AutentiquePort {
  private readonly logger = new Logger(AutentiqueService.name);
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  async enviarParaAssinatura(input: AutentiqueAssinaturaInput): Promise<AutentiqueDocumento> {
    // Autentique aceita PDF via URL pública ou base64 no campo `content`.
    const signatarios = input.signatarios.map((s, i) => ({
      name: s.nome,
      email: s.email,
      // Primeiro signatário (cliente) assina; segundo (Breakr) como testemunha/assina.
      positions: [{ page: 1, x: i === 0 ? 20 : 60, y: 80, z: 1 }],
    }));

    // Envio de arquivo generico (ex.: .docx do contrato) tem prioridade.
    if (input.arquivoBase64) {
      return this.enviarComArquivo(input);
    }
    // Se vier base64, converte para Buffer e manda como multipart.
    // Se vier URL, Autentique faz o download direto.
    if (input.pdfBase64) {
      return this.enviarComBase64(input, signatarios);
    }
    return this.enviarComUrl(input, signatarios);
  }

  // Envia um arquivo (ex.: .docx) via multipart `file: Upload!` — mesma logica do
  // fluxo oficial: mensagem, lembrete diario, prazo de 7 dias e 2 signatarios.
  private async enviarComArquivo(
    input: AutentiqueAssinaturaInput,
  ): Promise<AutentiqueDocumento> {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d+Z$/, '.000Z');
    const operations = JSON.stringify({
      query: `mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
        createDocument(document: $document, signers: $signers, file: $file) {
          id name signatures { public_id name email link { short_link } }
        }
      }`,
      variables: {
        document: {
          name: input.nomeDocumento,
          ...(input.mensagem ? { message: input.mensagem } : {}),
          reminder: 'DAILY',
          sortable: false,
          refusable: false,
          footer: 'BOTTOM',
          deadline_at: deadline,
          new_signature_style: true,
          ignore_cpf: false,
          configs: { notification_finished: true, notification_signed: false },
          locale: { language: 'pt-BR', country: 'BR', timezone: 'America/Sao_Paulo', date_format: 'DD_MM_YYYY' },
        },
        signers: input.signatarios.map((s) => ({ name: s.nome, email: s.email, action: 'SIGN' })),
        file: null,
      },
    });
    const map = JSON.stringify({ '0': ['variables.file'] });
    const buffer = Buffer.from(input.arquivoBase64 ?? '', 'base64');
    const form = new FormData();
    form.append('operations', operations);
    form.append('map', map);
    form.append(
      '0',
      new Blob([buffer], { type: input.mimeType ?? 'application/pdf' }),
      input.nomeArquivo ?? `${input.nomeDocumento}.pdf`,
    );

    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    if (!resp.ok) {
      throw new Error(`Autentique upload ${resp.status}`);
    }
    const json = (await resp.json()) as { data?: { createDocument: AutentiqueDocArquivo }; errors?: unknown[] };
    if (json.errors?.length) throw new Error(`Autentique: ${JSON.stringify(json.errors)}`);
    if (!json.data?.createDocument) throw new Error('Autentique: resposta sem data');
    const cd = json.data.createDocument;
    return {
      id: cd.id,
      status: 'PENDENTE',
      linkAssinatura: cd.signatures?.find((s) => s.link?.short_link)?.link?.short_link,
    };
  }

  private async enviarComUrl(
    input: AutentiqueAssinaturaInput,
    signatarios: Signatario[],
  ): Promise<AutentiqueDocumento> {
    const mutation = `
      mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!) {
        createDocument(document: $document, signers: $signers) {
          id
          name
          files { signed { url } }
          signers { link { short_link } }
        }
      }
    `;
    const variables = {
      document: {
        name: input.nomeDocumento,
        url: input.pdfUrl,
      },
      signers: signatarios,
    };
    const res = await this.gql<{ createDocument: AutentiqueDocRaw }>(mutation, variables);
    return this.mapDoc(res.createDocument);
  }

  private async enviarComBase64(
    input: AutentiqueAssinaturaInput,
    signatarios: Signatario[],
  ): Promise<AutentiqueDocumento> {
    // Autentique aceita upload multipart: operações GraphQL + map + file.
    const operations = JSON.stringify({
      query: `
        mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!) {
          createDocument(document: $document, signers: $signers) {
            id
            name
            signers { link { short_link } }
          }
        }
      `,
      variables: {
        document: { name: input.nomeDocumento, content: null },
        signers: signatarios,
      },
    });
    const map = JSON.stringify({ '0': ['variables.document.content'] });

    const pdfBuffer = Buffer.from(input.pdfBase64 ?? '', 'base64');
    const form = new FormData();
    form.append('operations', operations);
    form.append('map', map);
    form.append('0', new Blob([pdfBuffer], { type: 'application/pdf' }), `${input.nomeDocumento}.pdf`);

    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    if (!resp.ok) {
      throw new Error(`Autentique upload ${resp.status}`);
    }
    const json = (await resp.json()) as { data?: { createDocument: AutentiqueDocRaw }; errors?: unknown[] };
    if (json.errors?.length) throw new Error(`Autentique: ${JSON.stringify(json.errors)}`);
    if (!json.data?.createDocument) throw new Error('Autentique: resposta sem data');
    return this.mapDoc(json.data.createDocument);
  }

  private mapDoc(raw: AutentiqueDocRaw): AutentiqueDocumento {
    const link = raw.signers?.[0]?.link?.short_link ?? raw.signers?.[0]?.link?.url;
    return {
      id: raw.id,
      status: 'PENDENTE',
      linkAssinatura: link,
    };
  }

  private async gql<T>(query: string, variables: unknown): Promise<T> {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await resp.json()) as { data?: T; errors?: unknown[] };
    if (json.errors?.length) throw new Error(`Autentique GQL: ${JSON.stringify(json.errors)}`);
    if (!json.data) throw new Error('Autentique: resposta sem data');
    return json.data;
  }
}

interface Signatario {
  name: string;
  email: string;
  positions: { page: number; x: number; y: number; z: number }[];
}

interface AutentiqueDocRaw {
  id: string;
  name: string;
  signers?: Array<{ link?: { short_link?: string; url?: string } }>;
}

interface AutentiqueDocArquivo {
  id: string;
  name?: string;
  signatures?: Array<{ link?: { short_link?: string } }>;
}
