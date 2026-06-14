// Adapter Anthropic (Claude). Chamada real a /v1/messages.
import { Injectable } from '@nestjs/common';
import { IaProvider } from './ia.port';

interface AnthropicResp {
  content?: { text?: string }[];
}

@Injectable()
export class AnthropicProvider implements IaProvider {
  readonly nome = 'Anthropic';

  async completar(prompt: string, opts: { apiKey: string; modelo: string }): Promise<string> {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.modelo,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) {
      throw new Error(`Anthropic respondeu ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const data = (await resp.json()) as AnthropicResp;
    return data.content?.[0]?.text ?? '';
  }
}
