// Servico de RH — recrutamento e selecao (M19). Cada Vaga reune Candidatos que
// percorrem o funil de selecao (INSCRITO ate APROVADO/REPROVADO).
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Candidato, FitIA, Prisma, StatusCandidato, Vaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { IaService } from '../ia/ia.service';
import { CriarVagaDto } from './dto/criar-vaga.dto';
import { CriarCandidatoDto } from './dto/criar-candidato.dto';
import { CandidatarPublicoDto } from './dto/candidatar-publico.dto';
import { PerfilIdealVagaDto } from './dto/perfil-ideal-vaga.dto';

@Injectable()
export class RhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    private readonly ia: IaService,
  ) {}

  // Cria uma vaga (aberta por padrao) com codigo unico gerado (prefixo VAGA).
  criarVaga(dto: CriarVagaDto): Promise<Vaga> {
    return this.prisma.vaga.create({
      data: {
        titulo: dto.titulo,
        departamento: dto.departamento,
        descricao: dto.descricao,
        codigoUnico: this.codigoUnico.gerar('VAGA'),
      },
    });
  }

  // Define/atualiza o Perfil Ideal DISC da vaga (Job Fit). Aditivo — só grava os
  // campos reqPerc* informados. Valida que a vaga existe.
  async definirPerfilIdeal(id: string, dto: PerfilIdealVagaDto): Promise<Vaga> {
    const vaga = await this.prisma.vaga.findUnique({ where: { id } });
    if (!vaga) {
      throw new NotFoundException('Vaga nao encontrada');
    }
    return this.prisma.vaga.update({
      where: { id },
      data: {
        reqPercD: dto.reqPercD,
        reqPercI: dto.reqPercI,
        reqPercS: dto.reqPercS,
        reqPercC: dto.reqPercC,
      },
    });
  }

  // Lista as vagas (mais recentes primeiro), com a contagem de candidatos.
  listarVagas(): Promise<Vaga[]> {
    return this.prisma.vaga.findMany({
      include: {
        _count: { select: { candidatos: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Cadastra um candidato em uma vaga (status INSCRITO). Valida que a vaga
  // existe antes de criar.
  async criarCandidato(dto: CriarCandidatoDto): Promise<Candidato> {
    const vaga = await this.prisma.vaga.findUnique({
      where: { id: dto.vagaId },
    });
    if (!vaga) {
      throw new NotFoundException('Vaga nao encontrada');
    }
    return this.prisma.candidato.create({
      data: {
        vagaId: dto.vagaId,
        nome: dto.nome,
        email: dto.email,
        telefone: dto.telefone,
        perfilDisc: dto.perfilDisc,
        observacao: dto.observacao,
        // Source of Hire: origem informada no cadastro (default "Manual") e,
        // quando indicado, o colaborador que indicou. Aditivos.
        origem: dto.origem?.trim() || 'Manual',
        indicadoPor: dto.indicadoPor?.trim() || undefined,
        status: StatusCandidato.INSCRITO,
      },
    });
  }

  // Lista os candidatos (mais recentes primeiro), com filtro opcional por vaga
  // e etapa do funil.
  listarCandidatos(filtro?: {
    vagaId?: string;
    status?: StatusCandidato;
  }): Promise<Candidato[]> {
    const where: Prisma.CandidatoWhereInput = {};
    if (filtro?.vagaId !== undefined) {
      where.vagaId = filtro.vagaId;
    }
    if (filtro?.status !== undefined) {
      where.status = filtro.status;
    }
    return this.prisma.candidato.findMany({
      where,
      include: {
        vaga: { select: { titulo: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Move o candidato para outra etapa do funil de selecao.
  async moverStatusCandidato(
    id: string,
    status: StatusCandidato,
  ): Promise<Candidato> {
    const candidato = await this.prisma.candidato.findUnique({
      where: { id },
    });
    if (!candidato) {
      throw new NotFoundException('Candidato nao encontrado');
    }
    await this.prisma.candidato.update({
      where: { id },
      data: { status },
    });
    return this.prisma.candidato.findUniqueOrThrow({
      where: { id },
      include: {
        vaga: { select: { titulo: true } },
      },
    });
  }

  // Banco de talentos (req. l.426-433): pool reutilizavel de TODOS os candidatos
  // (independente da vaga), filtravel por perfil DISC, tag e texto (nome/email) —
  // ex.: consultar antes de abrir vaga ("estrategista -> perfil C + A").
  bancoTalentos(filtro?: {
    perfilDisc?: string;
    tag?: string;
    q?: string;
  }): Promise<Candidato[]> {
    const where: Prisma.CandidatoWhereInput = {};
    if (filtro?.perfilDisc) {
      where.perfilDisc = { contains: filtro.perfilDisc, mode: 'insensitive' };
    }
    if (filtro?.tag) {
      where.tags = { contains: filtro.tag, mode: 'insensitive' };
    }
    if (filtro?.q) {
      where.OR = [
        { nome: { contains: filtro.q, mode: 'insensitive' } },
        { email: { contains: filtro.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.candidato.findMany({
      where,
      include: { vaga: { select: { titulo: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Atualiza as tags do candidato no banco de talentos (ex.: "forte", "reavaliacao").
  async atualizarTags(id: string, tags?: string): Promise<Candidato> {
    const candidato = await this.prisma.candidato.findUnique({ where: { id } });
    if (!candidato) {
      throw new NotFoundException('Candidato nao encontrado');
    }
    return this.prisma.candidato.update({ where: { id }, data: { tags } });
  }

  // ── Página de Carreiras pública (inspirada no InHire) ──────────────────────
  // Vagas abertas para o portal público (sem login).
  vagasPublicas() {
    return this.prisma.vaga.findMany({
      where: { aberta: true },
      orderBy: { criadoEm: 'desc' },
      select: {
        codigoUnico: true,
        titulo: true,
        departamento: true,
        descricao: true,
      },
    });
  }

  // Detalhe de uma vaga aberta pelo código único (público).
  async vagaPublica(codigoUnico: string) {
    const vaga = await this.prisma.vaga.findFirst({
      where: { codigoUnico, aberta: true },
      select: {
        codigoUnico: true,
        titulo: true,
        departamento: true,
        descricao: true,
      },
    });
    if (!vaga) {
      throw new NotFoundException('Vaga não encontrada ou já encerrada');
    }
    return vaga;
  }

  // Inscrição pública sem login: cria o Candidato em INSCRITO com a origem
  // rastreada (Página de Carreiras ou Indicação, quando informado o indicador).
  async candidatarPublico(codigoUnico: string, dto: CandidatarPublicoDto) {
    const vaga = await this.prisma.vaga.findFirst({
      where: { codigoUnico, aberta: true },
    });
    if (!vaga) {
      throw new NotFoundException('Vaga não encontrada ou já encerrada');
    }
    const indicadoPor = dto.indicadoPor?.trim() || undefined;
    const candidato = await this.prisma.candidato.create({
      data: {
        vagaId: vaga.id,
        nome: dto.nome.trim(),
        email: dto.email,
        telefone: dto.telefone,
        curriculoUrl: dto.curriculoUrl,
        observacao: dto.mensagem,
        origem: indicadoPor ? 'Indicação' : 'Página de Carreiras',
        indicadoPor,
        status: StatusCandidato.INSCRITO,
      },
    });
    return { ok: true, candidatoId: candidato.id };
  }

  // ── Source of Hire (origem das candidaturas) ───────────────────────────────
  // Agrega os candidatos por origem, com total e taxa de aprovação — permite
  // saber quais canais geram as melhores contratações (inspirado no InHire).
  async sourceOfHire() {
    const candidatos = await this.prisma.candidato.findMany({
      select: { origem: true, status: true },
    });
    const mapa = new Map<string, { total: number; aprovados: number }>();
    for (const c of candidatos) {
      const chave = c.origem?.trim() || 'Não informado';
      const atual = mapa.get(chave) ?? { total: 0, aprovados: 0 };
      atual.total += 1;
      if (c.status === StatusCandidato.APROVADO) atual.aprovados += 1;
      mapa.set(chave, atual);
    }
    return Array.from(mapa.entries())
      .map(([origem, v]) => ({
        origem,
        total: v.total,
        aprovados: v.aprovados,
        taxaAprovacao: v.total ? Math.round((v.aprovados / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ── Triagem com IA (Fit Alto/Médio/Baixo) ──────────────────────────────────
  // Para cada candidato ativo da vaga, pede à IA um índice de aderência entre o
  // descritivo da vaga e os dados do candidato, gravando nível + pontuação +
  // justificativa. Degrada com mensagem clara se a IA não estiver configurada.
  async triagemIa(vagaId: string) {
    const vaga = await this.prisma.vaga.findUnique({ where: { id: vagaId } });
    if (!vaga) {
      throw new NotFoundException('Vaga não encontrada');
    }
    if (!(await this.ia.disponivel())) {
      throw new BadRequestException(
        'IA não configurada — ative e informe a chave do provedor em Configurações.',
      );
    }
    const candidatos = await this.prisma.candidato.findMany({
      where: {
        vagaId,
        status: { notIn: [StatusCandidato.APROVADO, StatusCandidato.REPROVADO] },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const avaliados: {
      id: string;
      nome: string;
      fitNivel: FitIA;
      fitPontuacao: number;
    }[] = [];

    for (const c of candidatos) {
      const prompt = this.montarPromptFit(vaga, c);
      let nivel: FitIA = FitIA.MEDIO;
      let pontuacao = 50;
      let justificativa = 'Sem avaliação.';
      try {
        const resp = await this.ia.completar(prompt);
        const parsed = this.parseFit(resp);
        nivel = parsed.nivel;
        pontuacao = parsed.pontuacao;
        justificativa = parsed.justificativa;
      } catch {
        justificativa = 'Não foi possível avaliar este candidato com a IA.';
      }
      await this.prisma.candidato.update({
        where: { id: c.id },
        data: {
          fitNivel: nivel,
          fitPontuacao: pontuacao,
          fitJustificativa: justificativa,
          fitAvaliadoEm: new Date(),
        },
      });
      avaliados.push({ id: c.id, nome: c.nome, fitNivel: nivel, fitPontuacao: pontuacao });
    }

    return { ok: true, total: avaliados.length, avaliados };
  }

  private montarPromptFit(vaga: Vaga, c: Candidato): string {
    return [
      'Você é um especialista em recrutamento e seleção. Avalie a aderência (fit)',
      'do candidato à vaga, de forma objetiva e transparente.',
      '',
      'VAGA:',
      `- Título: ${vaga.titulo}`,
      `- Departamento: ${vaga.departamento ?? '—'}`,
      `- Descrição/requisitos: ${vaga.descricao ?? '(não informada)'}`,
      '',
      'CANDIDATO:',
      `- Nome: ${c.nome}`,
      `- Perfil DISC: ${c.perfilDisc ?? '—'}`,
      `- Observações/currículo: ${c.observacao ?? c.curriculoUrl ?? '(sem dados adicionais)'}`,
      '',
      'Responda APENAS com um JSON válido (sem markdown, sem texto extra) no formato:',
      '{"nivel":"ALTO|MEDIO|BAIXO","pontuacao":<inteiro 0-100>,"justificativa":"<1 a 2 frases>"}',
    ].join('\n');
  }

  // Interpreta a resposta da IA de forma robusta (tolera cercas de código e
  // texto ao redor do JSON). Sempre retorna valores válidos.
  private parseFit(resp: string): {
    nivel: FitIA;
    pontuacao: number;
    justificativa: string;
  } {
    let nivel: FitIA = FitIA.MEDIO;
    let pontuacao = 50;
    let justificativa = 'Sem justificativa.';
    try {
      const inicio = resp.indexOf('{');
      const fim = resp.lastIndexOf('}');
      const bruto = inicio >= 0 && fim > inicio ? resp.slice(inicio, fim + 1) : resp;
      const obj = JSON.parse(bruto) as {
        nivel?: string;
        pontuacao?: number;
        justificativa?: string;
      };
      const n = String(obj.nivel ?? '').toUpperCase();
      if (n === 'ALTO' || n === 'MEDIO' || n === 'BAIXO') nivel = n as FitIA;
      if (typeof obj.pontuacao === 'number' && !Number.isNaN(obj.pontuacao)) {
        pontuacao = Math.max(0, Math.min(100, Math.round(obj.pontuacao)));
      }
      if (obj.justificativa) justificativa = String(obj.justificativa).slice(0, 500);
    } catch {
      // Resposta fora do formato — mantém defaults (MEDIO/50).
    }
    return { nivel, pontuacao, justificativa };
  }
}
