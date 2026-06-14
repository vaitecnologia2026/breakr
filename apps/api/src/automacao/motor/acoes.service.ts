// Catalogo de acoes internas do motor. Cada acao e um handler registrado por
// um `tipo` string; uma regra lista as acoes que executa. Extensivel: registrar
// uma acao nova = adicionar uma entrada no catalogo (sem mexer no dispatcher).
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { SquadsService } from '../../squads/squads.service';
import { WHATSAPP_PORT, WhatsappPort } from '../../integracoes';
import { Acao, ContextoExecucao, ResultadoAcao } from './tipos';

type Handler = (
  params: Record<string, unknown>,
  ctx: ContextoExecucao,
) => Promise<unknown>;

@Injectable()
export class AcoesService {
  private readonly logger = new Logger(AcoesService.name);
  private readonly catalogo = new Map<string, Handler>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly squads: SquadsService,
    @Inject(WHATSAPP_PORT) private readonly whatsapp: WhatsappPort,
  ) {
    this.registrarPadrao();
  }

  /** Tipos de acao disponiveis — o front usa para montar regras. */
  tiposDisponiveis(): string[] {
    return Array.from(this.catalogo.keys());
  }

  /**
   * Executa uma acao. Um erro vira ResultadoAcao.ok=false (nao derruba a regra
   * inteira aqui — o dispatcher decide o status final da execucao).
   */
  async executar(acao: Acao, ctx: ContextoExecucao): Promise<ResultadoAcao> {
    const handler = this.catalogo.get(acao.tipo);
    if (!handler) {
      return { tipo: acao.tipo, ok: false, erro: `Acao desconhecida: ${acao.tipo}` };
    }
    try {
      const detalhe = await handler(acao.params ?? {}, ctx);
      return { tipo: acao.tipo, ok: true, detalhe };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Acao "${acao.tipo}" falhou: ${msg}`);
      return { tipo: acao.tipo, ok: false, erro: msg };
    }
  }

  // ----------------------------------------------------------
  // Catalogo padrao (internas). Integracoes externas entram aqui depois
  // (ex.: 'enviar_whatsapp', 'emitir_nota') reusando os adapters/ports.
  // ----------------------------------------------------------
  private registrarPadrao(): void {
    // log: apenas registra uma mensagem (util p/ depurar/auditar regras).
    this.catalogo.set('log', async (params, ctx) => {
      const mensagem = this.interpolar(String(params.mensagem ?? ''), ctx.payload);
      this.logger.log(`[regra:log] ${mensagem}`);
      return { mensagem };
    });

    // notificar_cargo: pop-up/realtime para todos os usuarios de um cargo.
    this.catalogo.set('notificar_cargo', async (params, ctx) => {
      const cargo = String(params.cargo) as Cargo;
      const r = await this.notificacoes.notificarPorCargo(cargo, {
        titulo: this.interpolar(String(params.titulo ?? 'Aviso'), ctx.payload),
        mensagem: this.interpolar(String(params.mensagem ?? ''), ctx.payload),
        tipo: params.tipo ? String(params.tipo) : 'INFO',
        link: params.link ? this.interpolar(String(params.link), ctx.payload) : undefined,
      });
      return { cargo, enviadas: r.enviadas };
    });

    // atualizar_contrato: aplica `data` ao contrato do payload (ex.: mudar status).
    this.catalogo.set('atualizar_contrato', async (params, ctx) => {
      const contratoId = String(ctx.payload.contratoId ?? '');
      if (!contratoId) throw new Error('payload.contratoId ausente');
      const data = (params.data ?? {}) as Record<string, unknown>;
      // data e dinamico (vem da regra em JSON) — cast intencional.
      const atualizado = await this.prisma.contrato.update({
        where: { id: contratoId },
        data: data as never,
      });
      return { contratoId, status: atualizado.status };
    });

    // atribuir_squad: aloca o cliente do payload no squad ativo menos carregado.
    this.catalogo.set('atribuir_squad', async (_params, ctx) => {
      const clienteId = String(ctx.payload.clienteId ?? '');
      if (!clienteId) throw new Error('payload.clienteId ausente');
      const r = await this.squads.atribuirAutomatico(clienteId);
      return r ?? { atribuido: false, motivo: 'nenhum squad ativo' };
    });

    // criar_grupo_whatsapp: cria o grupo do cliente (stub) e guarda o id no cliente.
    this.catalogo.set('criar_grupo_whatsapp', async (params, ctx) => {
      const clienteId = String(ctx.payload.clienteId ?? '');
      if (!clienteId) throw new Error('payload.clienteId ausente');
      const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente) throw new Error('cliente nao encontrado');
      // Idempotente: ja tem grupo -> nao recria.
      if (cliente.whatsappGrupoId) {
        return { jaExistia: true, waGroupId: cliente.whatsappGrupoId };
      }
      const nome = this.interpolar(
        String(params.nome ?? 'Breakr x {{clienteNome}}'),
        ctx.payload,
      );
      // TODO: participantes reais (telefone do cliente + CS) quando houver.
      const grupo = await this.whatsapp.criarGrupo({ nome, participantes: [] });
      await this.prisma.cliente.update({
        where: { id: clienteId },
        data: { whatsappGrupoId: grupo.waGroupId },
      });
      return { waGroupId: grupo.waGroupId, nome: grupo.nome };
    });
  }

  // Substitui {{campo}} (ou {{a.b}}) pelo valor no payload.
  private interpolar(texto: string, payload: Record<string, unknown>): string {
    return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, caminho: string) => {
      const v = this.valorPorCaminho(payload, caminho);
      return v === undefined || v === null ? '' : String(v);
    });
  }

  private valorPorCaminho(obj: Record<string, unknown>, caminho: string): unknown {
    return caminho.split('.').reduce<unknown>((acc, parte) => {
      if (acc && typeof acc === 'object' && parte in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[parte];
      }
      return undefined;
    }, obj);
  }
}
