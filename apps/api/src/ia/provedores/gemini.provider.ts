// Adapter Google Gemini. Chamada real a generativelanguage (v1beta).
import { Injectable } from '@nestjs/common';
import { IaProvider } from './ia.port';

interface GeminiResp {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

@Injectable()
export class GeminiProvider implements IaProvider {
  readonly nome = 'Gemini';

  async completar(prompt: string, opts: { apiKey: string; modelo: string }): Promise<string> {
    // Chave no header (x-goog-api-key), nao na query string — evita vazar a
    // credencial em logs de URL / historico de requisicoes.
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(opts.modelo)}:generateContent`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': opts.apiKey,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!resp.ok) {
      throw new Error(`Gemini respondeu ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const data = (await resp.json()) as GeminiResp;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}
