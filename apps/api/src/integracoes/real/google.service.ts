// Adapter real do Google Docs/Drive via service account.
// Ativa quando GOOGLE_SERVICE_ACCOUNT_JSON estiver no ambiente.
// Usa a REST API diretamente (sem googleapis npm) com JWT de service account.
import { Injectable, Logger } from '@nestjs/common';
import { createSign } from 'crypto';
import {
  GoogleDoc,
  GoogleDocDeTemplateInput,
  GooglePastas,
  GooglePastasInput,
  GooglePort,
} from '../ports';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const DOCS_BASE = 'https://docs.googleapis.com/v1';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
];

const SUBPASTAS_PADRAO = [
  '1 - ID & MATERIAIS/1 - ID do Cliente',
  '1 - ID & MATERIAIS/2 - Materiais do Cliente/1. Fotos',
  '1 - ID & MATERIAIS/2 - Materiais do Cliente/2. Videos',
  '2 - [DESIGNS]',
  '3 - [VIDEOS]',
  '4 - [GESTAO]',
];

@Injectable()
export class GoogleService implements GooglePort {
  private readonly logger = new Logger(GoogleService.name);
  private tokenCache: { token: string; exp: number } | null = null;
  private readonly sa: ServiceAccountKey;

  constructor(serviceAccountJson: string) {
    this.sa = JSON.parse(serviceAccountJson) as ServiceAccountKey;
  }

  async gerarDocDeTemplate(input: GoogleDocDeTemplateInput): Promise<GoogleDoc> {
    const token = await this.getToken();

    // 1. Copiar o template no Drive
    const copyResp = await fetch(
      `${DRIVE_BASE}/files/${input.templateId}/copy`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input.nomeArquivo ?? 'Contrato Breakr' }),
      },
    );
    const copy = (await copyResp.json()) as { id: string };
    if (!copy.id) throw new Error('Google Drive: falha ao copiar template');
    const docId = copy.id;

    // 2. Substituir as variáveis via Docs batchUpdate
    const requests = Object.entries(input.variaveis).map(([tag, valor]) => ({
      replaceAllText: {
        containsText: { text: `{{${tag}}}`, matchCase: true },
        replaceText: valor,
      },
    }));
    await fetch(`${DOCS_BASE}/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    const linkDocumento = `https://docs.google.com/document/d/${docId}/edit`;
    const linkPdf = `https://docs.google.com/document/d/${docId}/export?format=pdf`;
    return { documentId: docId, linkDocumento, linkPdf };
  }

  async criarPastas(input: GooglePastasInput): Promise<GooglePastas> {
    const token = await this.getToken();
    const subpastas = input.subpastas ?? SUBPASTAS_PADRAO;

    // Pasta raiz do cliente
    const raizId = await this.criarPasta(token, input.nomeCliente);

    // Subpastas (suporte a hierarquia: "A/B" cria A, depois B dentro de A)
    const mapa: Record<string, string> = {};
    for (const caminho of subpastas) {
      const partes = caminho.split('/');
      let parentId = raizId;
      for (const parte of partes) {
        const id = await this.criarPasta(token, parte, parentId);
        parentId = id;
      }
      mapa[caminho] = parentId;
    }

    return { pastaRaizId: raizId, subpastas: mapa };
  }

  private async criarPasta(token: string, nome: string, parentId?: string): Promise<string> {
    const metadata: Record<string, unknown> = {
      name: nome,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];
    const resp = await fetch(`${DRIVE_BASE}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
    const data = (await resp.json()) as { id?: string; error?: unknown };
    if (!data.id) throw new Error(`Google Drive: falha ao criar pasta "${nome}": ${JSON.stringify(data.error)}`);
    return data.id;
  }

  // JWT service account → access token (cache de 55 min)
  private async getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.tokenCache && this.tokenCache.exp > now + 60) {
      return this.tokenCache.token;
    }

    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = b64url(
      JSON.stringify({
        iss: this.sa.client_email,
        scope: SCOPES.join(' '),
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    );
    const toSign = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(toSign);
    const sig = sign.sign(this.sa.private_key, 'base64url');
    const jwt = `${toSign}.${sig}`;

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    const data = (await resp.json()) as { access_token?: string; error?: string };
    if (!data.access_token) throw new Error(`Google OAuth: ${data.error ?? 'sem token'}`);
    this.tokenCache = { token: data.access_token, exp: now + 3600 };
    return data.access_token;
  }
}

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}
