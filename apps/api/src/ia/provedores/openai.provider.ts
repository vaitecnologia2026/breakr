// Adapter OpenAI (ChatGPT). Chamada real a /v1/chat/completions — so e exercitado
// quando ha chave salva em Configuracoes (ate la, IaService nem chega aqui).
import { Injectable } from '@nestjs/common';
import { IaProvider } from './ia.port';

interface OpenAiResp {
  choices?: { message?: { content?: string } }[];
}

@Injectable()
export class OpenAiProvider implements IaProvider {
  readonly nome = 'OpenAI';

  async completar(prompt: string, opts: { apiKey: string; modelo: string }): Promise<string> {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.modelo,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });
    if (!resp.ok) {
      throw new Error(`OpenAI respondeu ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const data = (await resp.json()) as OpenAiResp;
    return data.choices?.[0]?.message?.content ?? '';
  }
}
