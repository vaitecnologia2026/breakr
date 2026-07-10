// Servico de contratos (M12) — porta de entrada do pipeline.
// Fluxo: cria (RASCUNHO) -> envia p/ assinatura (Autentique) -> assinado cai
// em EM_REVISAO (revisao da Franciela) -> EM_VIGOR dispara a 1a cobranca.
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Contrato, Prisma } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { AUTENTIQUE_PORT, AutentiquePort } from '../integracoes';
import { EngineService } from '../automacao/engine.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { FaturasService } from '../faturas/faturas.service';
import { ContratoPdfService } from './contrato-pdf.service';
import { ContratoDocxService, EntregavelContrato, TipoContrato } from './contrato-docx.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';
import { CriarContratoLeadDto } from './dto/criar-contrato-lead.dto';

@Injectable()
export class ContratosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    @Inject(AUTENTIQUE_PORT) private readonly autentique: AutentiquePort,
    private readonly engine: EngineService,
    private readonly faturas: FaturasService,
    private readonly notificacoes: NotificacoesService,
    private readonly pdf: ContratoPdfService,
    private readonly docx: ContratoDocxService,
  ) {}

  // Cria um contrato em RASCUNHO. O valor vem do DTO ou, na falta, do plano.
  async criar(dto: CriarContratoDto): Promise<Contrato> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    // Plano: o do DTO tem prioridade; senao o do cliente.
    const planoId = dto.planoId ?? cliente.planoId ?? undefined;

    // Valor mensal: do DTO se enviado; senao busca o valor do plano.
    let valorMensal: Prisma.Decimal;
    if (dto.valorMensal !== undefined) {
      valorMensal = new Prisma.Decimal(dto.valorMensal);
    } else {
      const plano = planoId
        ? await this.prisma.plano.findUnique({ where: { id: planoId } })
        : null;
      if (!plano) {
        throw new NotFoundException(
          'Valor do contrato nao informado e nenhum plano disponivel para deriva-lo',
        );
      }
      valorMensal = new Prisma.Decimal(plano.valor);
    }

    const contrato = await this.prisma.contrato.create({
      data: {
        clienteId: dto.clienteId,
        planoId,
        valorMensal,
        status: 'RASCUNHO',
        codigoUnico: this.codigoUnico.gerar('CTR'),
        ...(dto.vencimento !== undefined && {
          vencimento: new Date(dto.vencimento),
        }),
        renovacaoAutomatica: dto.renovacaoAutomatica ?? true,
      },
    });

    await this.engine.dispatch('contrato.criado', {
      contratoId: contrato.id,
      clienteId: dto.clienteId,
    });

    return contrato;
  }

  // Cria um contrato a partir do negocio (Lead) — "Criar Contrato" no detalhe.
  // Garante um Cliente vinculado (cria a partir do cadastro, se faltar) e guarda
  // os campos comerciais (tipo/duracao/desconto/forma/dia/data) que viram tags.
  async criarDoLead(leadId: string, dto: CriarContratoLeadDto): Promise<Contrato> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        cadastroContrato: true,
        planos: { include: { plano: true } },
      },
    });
    if (!lead) {
      throw new NotFoundException('Negocio (lead) nao encontrado');
    }

    // Garante um Cliente vinculado ao negocio.
    let clienteId = lead.clienteId ?? undefined;
    if (!clienteId) {
      const cad = lead.cadastroContrato;
      const nomeFantasia =
        cad?.nomeFantasia?.trim() ||
        cad?.razaoSocial?.trim() ||
        lead.empresa?.trim() ||
        lead.nome;
      const cliente = await this.prisma.cliente.create({
        data: {
          nomeFantasia,
          cnpj: cad?.cnpj ?? undefined,
          email: cad?.email ?? lead.email ?? undefined,
          telefone: cad?.whatsappFinanceiro ?? lead.telefone ?? undefined,
          status: 'NOVO',
          codigoUnico: this.codigoUnico.gerar('CLI'),
        },
      });
      clienteId = cliente.id;
      await this.prisma.lead.update({ where: { id: leadId }, data: { clienteId } });
    }

    // Plano: do DTO, senao o 1o plano do negocio.
    const planoId = dto.planoId ?? lead.planos[0]?.planoId ?? undefined;

    // Valor mensal: do DTO; senao o valor do negocio (soma dos itens); senao plano.
    let valorMensal: Prisma.Decimal;
    if (dto.valorMensal !== undefined) {
      valorMensal = new Prisma.Decimal(dto.valorMensal);
    } else if (lead.valorEstimado != null) {
      valorMensal = new Prisma.Decimal(lead.valorEstimado);
    } else if (planoId) {
      const plano = await this.prisma.plano.findUnique({ where: { id: planoId } });
      valorMensal = new Prisma.Decimal(plano?.valor ?? 0);
    } else {
      valorMensal = new Prisma.Decimal(0);
    }

    const contrato = await this.prisma.contrato.create({
      data: {
        clienteId,
        planoId,
        leadId,
        valorMensal,
        status: 'RASCUNHO',
        codigoUnico: this.codigoUnico.gerar('CTR'),
        tipoContrato: dto.tipo,
        ...(dto.duracaoMeses !== undefined && { duracaoMeses: dto.duracaoMeses }),
        ...(dto.descontoPct !== undefined && { descontoPct: dto.descontoPct }),
        ...(dto.formaPagamento !== undefined && { formaPagamento: dto.formaPagamento }),
        ...(dto.diaPagamento !== undefined && { diaPagamento: dto.diaPagamento }),
        ...(dto.dataAssinatura !== undefined && { dataAssinatura: new Date(dto.dataAssinatura) }),
      },
    });

    await this.engine.dispatch('contrato.criado', { contratoId: contrato.id, clienteId });
    return contrato;
  }

  // Gera o .docx do contrato (modelo COM/SEM Marketing) com as tags preenchidas
  // pelo cadastro + planos/produtos do negocio. Usado pelo endpoint de download.
  async gerarDocx(id: string): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: {
        cliente: true,
        plano: { include: { produtos: { include: { produto: true } } } },
        lead: {
          include: {
            cadastroContrato: true,
            planos: { include: { plano: { include: { produtos: { include: { produto: true } } } } } },
            produtos: { include: { produto: true } },
          },
        },
      },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato nao encontrado');
    }

    const cad = contrato.lead?.cadastroContrato ?? null;

    // Entregaveis = os PRODUTOS que compoem cada plano selecionado (nao o nome do
    // plano) + os produtos avulsos do negocio. Se um plano nao tiver produtos
    // vinculados, cai para o proprio plano (para nao ficar vazio).
    const entregaveis: EntregavelContrato[] = [];
    for (const lp of contrato.lead?.planos ?? []) {
      const prods = lp.plano.produtos ?? [];
      if (prods.length) {
        for (const pp of prods) entregaveis.push({ nome: pp.produto.nome, descricao: pp.produto.descricao });
      } else {
        entregaveis.push({ nome: lp.plano.nome, descricao: this.descreverEntregaveis(lp.plano.entregaveis) });
      }
    }
    for (const pr of contrato.lead?.produtos ?? []) {
      entregaveis.push({ nome: pr.produto.nome, descricao: pr.produto.descricao });
    }
    if (entregaveis.length === 0 && contrato.plano) {
      const prods = contrato.plano.produtos ?? [];
      if (prods.length) {
        for (const pp of prods) entregaveis.push({ nome: pp.produto.nome, descricao: pp.produto.descricao });
      } else {
        entregaveis.push({ nome: contrato.plano.nome, descricao: this.descreverEntregaveis(contrato.plano.entregaveis) });
      }
    }

    const buffer = this.docx.gerar((contrato.tipoContrato as TipoContrato) ?? 'COM_MARKETING', {
      codigoContrato: contrato.codigoUnico,
      razaoSocial: cad?.razaoSocial ?? contrato.cliente.nomeFantasia,
      cnpj: cad?.cnpj ?? contrato.cliente.cnpj,
      endereco: this.montarEndereco(cad),
      email: cad?.email ?? contrato.cliente.email,
      whatsappCobranca: cad?.whatsappFinanceiro ?? contrato.cliente.telefone,
      socio: cad?.nomeSocio,
      cpf: cad?.cpfSocio,
      entregaveis,
      duracaoMeses: contrato.duracaoMeses,
      precoMensal: Number(contrato.valorMensal),
      diaPagamento: contrato.diaPagamento,
      descontoPct: contrato.descontoPct,
      formaPagamento: contrato.formaPagamento,
      dataAssinatura: contrato.dataAssinatura,
    });
    return { buffer, nomeArquivo: `contrato-${contrato.codigoUnico}.docx` };
  }

  // Envia o contrato (.docx gerado) para assinatura no Autentique, para o contato
  // cadastrado no negocio (Cadastro Completo). Reaproveita o gerarDocx e o token
  // configurado em Configuracoes -> Integracoes. Segue a logica do fluxo oficial.
  async enviarContratoAssinatura(id: string): Promise<Contrato> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true, lead: { include: { cadastroContrato: true } } },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato nao encontrado');
    }

    const cad = contrato.lead?.cadastroContrato ?? null;
    const nomeSignatario = cad?.nomeSocio?.trim() || contrato.cliente.nomeFantasia;
    const emailSignatario = (cad?.email?.trim() || contrato.cliente.email || contrato.lead?.email || '').trim();
    if (!emailSignatario) {
      throw new BadRequestException('Informe o e-mail no Cadastro Completo antes de enviar para assinatura.');
    }

    const { buffer, nomeArquivo } = await this.gerarDocx(id);

    const doc = await this.autentique.enviarParaAssinatura({
      nomeDocumento: `Contrato ${contrato.codigoUnico} — ${contrato.cliente.nomeFantasia}`,
      arquivoBase64: buffer.toString('base64'),
      nomeArquivo,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mensagem: `Olá, ${nomeSignatario}. Segue nosso contrato para assinatura. Qualquer dúvida, estou à disposição, atenciosamente: Franciele.`,
      signatarios: [
        { nome: nomeSignatario, email: emailSignatario },
        { nome: 'Gustavo Costa', email: 'financeiro@breakr.com.br' },
      ],
    });

    const atualizado = await this.prisma.contrato.update({
      where: { id },
      data: {
        autentiqueId: doc.id,
        docUrl: doc.linkAssinatura,
        status: 'AGUARDANDO_ASSINATURA',
      },
    });

    await this.engine.dispatch('contrato.enviado_assinatura', { contratoId: id });

    return atualizado;
  }

  // Renderiza o JSON de entregaveis do plano numa descricao legivel.
  private descreverEntregaveis(entregaveis: Prisma.JsonValue | null): string | null {
    if (entregaveis == null) return null;
    if (typeof entregaveis === 'string') return entregaveis;
    if (Array.isArray(entregaveis)) return entregaveis.map((x) => String(x)).join(', ');
    if (typeof entregaveis === 'object') {
      const partes = Object.entries(entregaveis as Record<string, unknown>)
        .map(([k, v]) => (v === true ? k : v === false ? '' : `${k}: ${String(v)}`))
        .filter(Boolean);
      return partes.join('; ') || null;
    }
    return String(entregaveis);
  }

  private montarEndereco(cad: {
    endereco?: string | null; numero?: string | null; complemento?: string | null;
    bairro?: string | null; cidadeEstado?: string | null; cep?: string | null;
  } | null): string {
    if (!cad) return '';
    return [
      [cad.endereco, cad.numero].filter(Boolean).join(', '),
      cad.complemento,
      cad.bairro,
      cad.cidadeEstado,
      cad.cep ? `CEP ${cad.cep}` : '',
    ]
      .map((p) => (p ?? '').toString().trim())
      .filter(Boolean)
      .join(' - ');
  }

  /** Gera o PDF nativo do contrato e retorna como Buffer. Usado pelo endpoint de download. */
  async gerarPdf(id: string): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true, plano: true },
    });
    if (!contrato) throw new NotFoundException('Contrato nao encontrado');
    const buffer = await this.pdf.gerar({
      codigoUnico: contrato.codigoUnico,
      clienteNome: contrato.cliente.nomeFantasia,
      clienteCnpj: contrato.cliente.cnpj,
      planoNome: contrato.plano?.nome,
      valorMensal: Number(contrato.valorMensal),
      dataInicio: contrato.dataInicio,
      vencimento: contrato.vencimento,
    });
    return { buffer, nomeArquivo: `contrato-${contrato.codigoUnico}.pdf` };
  }

  // Gera o PDF nativo e envia para assinatura no Autentique.
  async enviarParaAssinatura(id: string): Promise<Contrato> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true, plano: true },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato nao encontrado');
    }

    // PDF gerado 100% pelo sistema — sem Google Docs.
    const pdfBuffer = await this.pdf.gerar({
      codigoUnico: contrato.codigoUnico,
      clienteNome: contrato.cliente.nomeFantasia,
      clienteCnpj: contrato.cliente.cnpj,
      planoNome: contrato.plano?.nome,
      valorMensal: Number(contrato.valorMensal),
      dataInicio: contrato.dataInicio,
      vencimento: contrato.vencimento,
    });

    // Retorno (id do doc, link de assinatura) e salvo no nosso banco.
    const doc = await this.autentique.enviarParaAssinatura({
      nomeDocumento: `Contrato ${contrato.codigoUnico} — ${contrato.cliente.nomeFantasia}`,
      pdfBase64: pdfBuffer.toString('base64'),
      signatarios: [
        { nome: contrato.cliente.nomeFantasia, email: contrato.cliente.email ?? 'contato@cliente.com' },
      ],
    });

    const atualizado = await this.prisma.contrato.update({
      where: { id },
      data: {
        autentiqueId: doc.id,
        docUrl: doc.linkAssinatura,
        status: 'AGUARDANDO_ASSINATURA',
      },
    });

    await this.engine.dispatch('contrato.enviado_assinatura', { contratoId: id });

    return atualizado;
  }

  // Marca o contrato como assinado -> cai em EM_REVISAO (revisao interna antes
  // de vigorar). Simula o webhook do Autentique. Notifica o financeiro.
  async marcarAssinado(id: string): Promise<Contrato> {
    const existente = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true },
    });
    if (!existente) {
      throw new NotFoundException('Contrato nao encontrado');
    }

    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: { status: 'EM_REVISAO' },
    });

    await this.engine.dispatch('contrato.assinado', { contratoId: id });
    await this.notificacoes.notificarPorCargo(Cargo.FINANCEIRO, {
      titulo: 'Contrato para revisão',
      mensagem: `Contrato ${existente.codigoUnico} de ${existente.cliente.nomeFantasia} assinado — revisar antes de entrar em vigor.`,
      tipo: 'ALERTA',
      link: '/contratos',
    });

    return contrato;
  }

  // Coloca o contrato EM_VIGOR e dispara a 1a cobranca. Define dataInicio e,
  // se ainda nao houver, vencimento = inicio + 30 dias.
  async colocarEmVigor(id: string): Promise<Contrato> {
    const existente = await this.prisma.contrato.findUnique({
      where: { id },
    });
    if (!existente) {
      throw new NotFoundException('Contrato nao encontrado');
    }
    // Guarda: nao revigora um contrato ja em vigor (evita 2a cobranca).
    if (existente.status === 'EM_VIGOR') {
      return existente;
    }

    const dataInicio = new Date();
    const vencimento =
      existente.vencimento ??
      new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Reivindica o contrato atomicamente: so a chamada que troca o status
    // (count === 1) segue para gerar a cobranca, evitando 2a cobranca em
    // chamadas concorrentes.
    const claim = await this.prisma.contrato.updateMany({
      where: { id, status: { not: 'EM_VIGOR' } },
      data: { status: 'EM_VIGOR', dataInicio, vencimento },
    });
    if (claim.count === 0) {
      return existente;
    }

    try {
      // Gera a 1a cobranca apenas se ainda nao houver fatura para o contrato
      // (idempotente: um retry apos falha nao duplica a cobranca).
      const jaTemFatura = await this.prisma.fatura.findFirst({
        where: { contratoId: id },
        select: { id: true },
      });
      if (!jaTemFatura) {
        await this.faturas.gerarCobranca(id);
      }
      await this.engine.dispatch('contrato.em_vigor', { contratoId: id });
    } catch (erro) {
      // Falhou ao gerar a cobranca: reverte o status para permitir reprocessar.
      // Sem isso o contrato ficaria EM_VIGOR sem fatura e o guard de idempotencia
      // bloquearia o retry, deixando a 1a cobranca nunca gerada.
      await this.prisma.contrato.update({
        where: { id },
        data: {
          status: existente.status,
          dataInicio: existente.dataInicio,
          vencimento: existente.vencimento,
        },
      });
      throw erro;
    }

    return this.prisma.contrato.findUniqueOrThrow({ where: { id } });
  }

  // Lista todos os contratos (mais recentes primeiro).
  listar(): Promise<Contrato[]> {
    return this.prisma.contrato.findMany({
      orderBy: { criadoEm: 'desc' },
      // plano (nome + tiposProjeto) p/ exibir o "caminho do switch de planos" (A4, l.74).
      include: {
        cliente: { select: { nomeFantasia: true } },
        plano: { select: { nome: true, tiposProjeto: true } },
      },
    });
  }

  // Detalhe de um contrato.
  async obter(id: string): Promise<Contrato> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true, plano: true },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato nao encontrado');
    }
    return contrato;
  }
}
