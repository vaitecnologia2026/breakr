import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IaService } from './ia.service';

interface MsgHistorico {
  role: 'user' | 'assistant';
  conteudo: string;
}

@Injectable()
export class IaAssistenteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ia: IaService,
  ) {}

  private async obterContexto(): Promise<string> {
    const [
      clientes,
      contratos,
      cobrancasVencidas,
      conversasPendentes,
      conteudosProducao,
      comprasPendentes,
      bugsAbertos,
    ] = await Promise.all([
      this.prisma.cliente.count({ where: { status: 'ATIVO' } }),
      this.prisma.contrato.count({ where: { status: 'EM_VIGOR' } }).catch(() => 0),
      this.prisma.fatura.count({ where: { status: 'VENCIDA' } }).catch(() => 0),
      this.prisma.conversa.count({ where: { status: 'PENDENTE' } }).catch(() => 0),
      this.prisma.conteudo.count({ where: { status: 'PRODUCAO' } }).catch(() => 0),
      this.prisma.compra.count({ where: { status: 'SOLICITADA' } }).catch(() => 0),
      this.prisma.bug.count({ where: { status: { in: ['ABERTO', 'EM_ANDAMENTO'] } } }).catch(() => 0),
    ]);

    return `CONTEXTO DO SISTEMA BREAKR OS (dados em tempo real):
- Clientes ativos: ${clientes}
- Contratos vigentes: ${contratos}
- Cobranças vencidas: ${cobrancasVencidas}
- Conversas pendentes no atendimento: ${conversasPendentes}
- Conteúdos em produção: ${conteudosProducao}
- Compras aguardando aprovação: ${comprasPendentes}
- Bugs/tickets em aberto: ${bugsAbertos}`;
  }

  async chat(mensagem: string, historico: MsgHistorico[]): Promise<string> {
    const disponivel = await this.ia.disponivel();
    if (!disponivel) {
      return 'A IA ainda não está configurada. Acesse Configurações → IA e informe a chave do provedor (OpenAI, Anthropic ou Gemini).';
    }

    const ctx = await this.obterContexto();

    const conv = [
      ...historico.map(
        (m) => `${m.role === 'user' ? 'Operador' : 'BRK IA'}: ${m.conteudo}`,
      ),
      `Operador: ${mensagem}`,
      'BRK IA:',
    ].join('\n');

    const prompt = `Você é o BRK IA, assistente operacional inteligente do sistema Breakr OS — uma plataforma de gestão de agência de marketing.

${ctx}

SUAS CAPACIDADES:
- Responder perguntas sobre os dados e métricas acima
- Ajudar operadores a entender como usar o sistema
- Dar suporte no atendimento ao cliente (WhatsApp inbox)
- Sugerir ações baseadas no contexto atual
- Explicar processos: contrato → cobrança → onboarding → conteúdo

REGRAS:
- Responda em português do Brasil, de forma direta e profissional
- Use apenas os dados fornecidos; nunca invente números
- Se não souber algo, diga onde o usuário pode encontrar no menu do sistema
- Seja conciso: respostas curtas e úteis

CONVERSA:
${conv}`;

    return this.ia.completar(prompt);
  }
}
