// Serviço do teste DISC. Banco de perguntas editável pelo admin (Configurações);
// teste público para candidatos; scoring por dimensão (D/I/S/C). Ao concluir,
// cria o Candidato na vaga com o perfil calculado.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SalvarPerguntaDto } from './dto/salvar-pergunta.dto';
import { CandidaturaDiscDto } from './dto/candidatura-disc.dto';
import { interpretarPerfil } from './disc-perfis';
import {
  calcularGraficos,
  calcularPercentis,
  detectarAnomalia,
  DIMENSOES,
  type Placar,
} from './disc-calculo';

type Dimensao = 'D' | 'I' | 'S' | 'C';
interface OpcaoDisc {
  texto: string;
  dimensao: Dimensao;
}

const ROTULO_DIM: Record<Dimensao, string> = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

@Injectable()
export class DiscService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Admin: banco de perguntas ---
  listarPerguntas() {
    return this.prisma.discPergunta.findMany({ orderBy: { ordem: 'asc' } });
  }

  private validarOpcoes(opcoes: OpcaoDisc[]) {
    if (!Array.isArray(opcoes) || opcoes.length < 2) {
      throw new BadRequestException('A pergunta precisa de pelo menos 2 opções');
    }
    for (const o of opcoes) {
      if (!o.texto || !['D', 'I', 'S', 'C'].includes(o.dimensao)) {
        throw new BadRequestException('Cada opção precisa de texto e dimensão (D/I/S/C)');
      }
    }
  }

  criarPergunta(dto: SalvarPerguntaDto) {
    this.validarOpcoes(dto.opcoes);
    return this.prisma.discPergunta.create({
      data: {
        enunciado: dto.enunciado,
        ordem: dto.ordem ?? 0,
        ativo: dto.ativo ?? true,
        opcoes: dto.opcoes as unknown as object[],
      },
    });
  }

  async atualizarPergunta(id: string, dto: SalvarPerguntaDto) {
    await this.garantir(id);
    if (dto.opcoes) this.validarOpcoes(dto.opcoes);
    return this.prisma.discPergunta.update({
      where: { id },
      data: {
        enunciado: dto.enunciado,
        ordem: dto.ordem,
        ativo: dto.ativo,
        opcoes: dto.opcoes ? (dto.opcoes as unknown as object[]) : undefined,
      },
    });
  }

  async removerPergunta(id: string) {
    await this.garantir(id);
    await this.prisma.discPergunta.delete({ where: { id } });
    return { ok: true };
  }

  private async garantir(id: string) {
    const p = await this.prisma.discPergunta.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Pergunta nao encontrada');
    return p;
  }

  // --- Público: teste (sem revelar as dimensões das opções) ---
  async teste() {
    const perguntas = await this.prisma.discPergunta.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
    });
    return perguntas.map((p) => ({
      id: p.id,
      enunciado: p.enunciado,
      opcoes: (p.opcoes as unknown as OpcaoDisc[]).map((o, i) => ({ indice: i, texto: o.texto })),
    }));
  }

  async vagasAbertas() {
    const vagas = await this.prisma.vaga.findMany({
      where: { aberta: true },
      orderBy: { criadoEm: 'desc' },
      select: { id: true, titulo: true, departamento: true },
    });
    return vagas;
  }

  // Recebe a candidatura + respostas, calcula o perfil e cria o Candidato.
  async candidatar(dto: CandidaturaDiscDto) {
    const vaga = await this.prisma.vaga.findUnique({ where: { id: dto.vagaId } });
    if (!vaga) throw new NotFoundException('Vaga nao encontrada');

    const perguntas = await this.prisma.discPergunta.findMany({
      where: { id: { in: dto.respostas.map((r) => r.perguntaId) } },
    });
    const mapa = new Map(perguntas.map((p) => [p.id, p.opcoes as unknown as OpcaoDisc[]]));

    // Contagem ipsativa: "Mais" (adaptado) e "Menos" (rejeição), por dimensão.
    // Compatível com o formato antigo (opcaoIndice = uma escolha "Mais", sem "Menos").
    const mais: Placar = { D: 0, I: 0, S: 0, C: 0 };
    const menos: Placar = { D: 0, I: 0, S: 0, C: 0 };
    let blocos = 0;
    for (const r of dto.respostas) {
      const opcoes = mapa.get(r.perguntaId);
      if (!opcoes) continue;
      blocos++;
      const idxMais = r.maisIndice ?? r.opcaoIndice;
      if (idxMais !== undefined && opcoes[idxMais]) mais[opcoes[idxMais].dimensao] += 1;
      if (r.menosIndice !== undefined && r.menosIndice !== idxMais && opcoes[r.menosIndice]) {
        menos[opcoes[r.menosIndice].dimensao] += 1;
      }
    }

    // 3 gráficos (Adaptado/Natural/Combinado), percentis e anomalia (documento).
    const graficos = calcularGraficos(mais, menos, blocos);
    const percentis = calcularPercentis(graficos.combinado);
    const anomalia = detectarAnomalia(percentis);

    // Perfil primário/secundário pelo Gráfico 3 (Combinado) via percentis.
    const rankCombinado = DIMENSOES.slice().sort((a, b) => percentis[b] - percentis[a]);
    const predominantes = rankCombinado.filter((d) => graficos.combinado[d] > 0);
    const primario = predominantes[0] ?? rankCombinado[0] ?? null;
    const secundario = predominantes[1] ?? rankCombinado[1] ?? null;
    const interpretacao = interpretarPerfil(primario, secundario);

    // Resumo textual (compatibilidade com Recrutamento/BancoTalentos) — baseado no
    // Gráfico Adaptado (Mais), como no comportamento validado anterior.
    const rankAdaptado = DIMENSOES.slice().sort((a, b) => graficos.adaptado[b] - graficos.adaptado[a]);
    const perfil =
      rankAdaptado
        .filter((d) => graficos.adaptado[d] > 0)
        .map((d) => `${d} (${graficos.adaptado[d]})`)
        .join(' · ') || 'Sem respostas';
    const resumo = `Perfil: ${rankAdaptado.slice(0, 2).map((d) => ROTULO_DIM[d]).join(' / ')} — ${perfil}`;

    const discResultado = { graficos, percentis, anomalia, primario, secundario };

    const candidato = await this.prisma.candidato.create({
      data: {
        nome: dto.nome.trim(),
        email: dto.email,
        telefone: dto.telefone,
        curriculoUrl: dto.curriculoUrl,
        perfilDisc: resumo,
        discResultado: discResultado as unknown as Prisma.InputJsonValue,
        vagaId: dto.vagaId,
      },
    });

    return {
      ok: true,
      candidatoId: candidato.id,
      perfil: resumo,
      primario,
      secundario,
      interpretacao,
      graficos,
      percentis,
      anomalia,
    };
  }
}
