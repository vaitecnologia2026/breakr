// Adapter real da Speed (emissão de NF-e).
// Ativa quando SPEED_API_KEY estiver no ambiente.
// Ref: https://developers.speedapp.com.br (Speed NFS-e)
import { Injectable, Logger } from '@nestjs/common';
import { SpeedNota, SpeedNotaInput, SpeedPort } from '../ports';

const BASE = 'https://api.speedapp.com.br/v1';

@Injectable()
export class SpeedService implements SpeedPort {
  private readonly logger = new Logger(SpeedService.name);

  constructor(private readonly apiKey: string) {}

  async emitirNota(input: SpeedNotaInput): Promise<SpeedNota> {
    const body = {
      customer_id: input.clienteId,
      services: [
        {
          description: input.descricaoServico,
          amount: input.valor,
          // Código padrão de serviço de agência de marketing (lista municipal)
          service_item_code: '17.01',
          iss_rate: 5,
        },
      ],
    };

    const resp = await fetch(`${BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Speed NF-e ${resp.status}: ${txt.slice(0, 300)}`);
    }

    const data = (await resp.json()) as SpeedNotaRaw;
    return {
      id: data.id,
      status: data.status ?? 'PROCESSANDO',
      linkPdf: data.pdf_url,
    };
  }
}

interface SpeedNotaRaw {
  id: string;
  status?: string;
  pdf_url?: string;
}
