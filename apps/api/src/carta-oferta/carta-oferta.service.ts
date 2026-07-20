// Serviço de Carta Oferta parametrizável (inspirado no InHire). Modelos com
// variáveis {{campo}} ou {{campo;tipo}} que são substituídas ao gerar a carta
// de um candidato. Aditivo — não altera o funil de recrutamento existente.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusCartaOferta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarTemplateCartaDto } from './dto/criar-template-carta.dto';
import { GerarCartaDto } from './dto/gerar-carta.dto';

// Casa {{campo}} e {{campo;tipo}} (tolera espaços). O nome do campo é a parte
// antes do ';'. Ex.: {{salario;moeda}} → campo "salario".
const REGEX_VAR = /\{\{\s*([^{}]+?)\s*\}\}/g;

@Injectable()
export class CartaOfertaService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Modelos ────────────────────────────────────────────────────────────────
  listarTemplates() {
    return this.prisma.cartaOfertaTemplate.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  criarTemplate(dto: CriarTemplateCartaDto) {
    return this.prisma.cartaOfertaTemplate.create({
      data: {
        nome: dto.nome,
        assunto: dto.assunto,
        conteudo: dto.conteudo,
        ativo: dto.ativo ?? true,
      },
    });
  }

  async atualizarTemplate(id: string, dto: CriarTemplateCartaDto) {
    await this.garantirTemplate(id);
    return this.prisma.cartaOfertaTemplate.update({
      where: { id },
      data: {
        nome: dto.nome,
        assunto: dto.assunto,
        conteudo: dto.conteudo,
        ativo: dto.ativo,
      },
    });
  }

  async removerTemplate(id: string) {
    await this.garantirTemplate(id);
    await this.prisma.cartaOfertaTemplate.delete({ where: { id } });
    return { ok: true };
  }

  private async garantirTemplate(id: string) {
    const t = await this.prisma.cartaOfertaTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Modelo de carta não encontrado');
    return t;
  }

  // Extrai a lista de variáveis únicas ({{campo;tipo}}) de um conteúdo, para a
  // UI saber quais campos pedir ao usuário.
  extrairVariaveis(conteudo: string): { campo: string; tipo: string }[] {
    const vistos = new Set<string>();
    const out: { campo: string; tipo: string }[] = [];
    for (const m of conteudo.matchAll(REGEX_VAR)) {
      const partes = m[1].split(';');
      const campo = partes[0].trim();
      const tipo = (partes[1] ?? 'texto').trim() || 'texto';
      if (campo && !vistos.has(campo)) {
        vistos.add(campo);
        out.push({ campo, tipo });
      }
    }
    return out;
  }

  // Renderiza o conteúdo substituindo as variáveis pelos valores informados.
  // Variável sem valor vira string vazia (não deixa {{...}} solto).
  private renderizar(conteudo: string, valores: Record<string, string>): string {
    return conteudo.replace(REGEX_VAR, (_m, inner: string) => {
      const campo = String(inner).split(';')[0].trim();
      const v = valores[campo];
      return v != null && v !== '' ? String(v) : '';
    });
  }

  // Preview em memória (não persiste) — para a UI mostrar a carta enquanto edita.
  previa(conteudo: string, valores?: Record<string, string>) {
    return { renderizado: this.renderizar(conteudo, valores ?? {}) };
  }

  // ── Cartas geradas ──────────────────────────────────────────────────────────
  listarCartas(candidatoId?: string) {
    const where: Prisma.CartaOfertaWhereInput = {};
    if (candidatoId) where.candidatoId = candidatoId;
    return this.prisma.cartaOferta.findMany({
      where,
      include: {
        candidato: { select: { nome: true, email: true } },
        template: { select: { nome: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Gera a carta de um candidato a partir de um modelo. Auto-preenche dados do
  // candidato/vaga; os demais campos vêm de `valores`. Persiste o texto final.
  async gerarCarta(dto: GerarCartaDto) {
    const candidato = await this.prisma.candidato.findUnique({
      where: { id: dto.candidatoId },
      include: { vaga: { select: { titulo: true, departamento: true } } },
    });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');

    const template = await this.garantirTemplate(dto.templateId);

    // Variáveis automáticas do candidato/vaga (o usuário pode sobrescrever).
    const auto: Record<string, string> = {
      nome_candidato: candidato.nome,
      email_candidato: candidato.email ?? '',
      telefone_candidato: candidato.telefone ?? '',
      vaga: candidato.vaga?.titulo ?? '',
      departamento: candidato.vaga?.departamento ?? '',
      data: new Date().toLocaleDateString('pt-BR'),
    };
    const valores = { ...auto, ...(dto.valores ?? {}) };
    const conteudoRenderizado = this.renderizar(template.conteudo, valores);

    return this.prisma.cartaOferta.create({
      data: {
        candidatoId: candidato.id,
        templateId: template.id,
        titulo: dto.titulo?.trim() || `${template.nome} — ${candidato.nome}`,
        conteudoRenderizado,
        valores: valores as unknown as Prisma.InputJsonValue,
        status: StatusCartaOferta.RASCUNHO,
      },
    });
  }

  async atualizarStatusCarta(id: string, status: StatusCartaOferta) {
    const carta = await this.prisma.cartaOferta.findUnique({ where: { id } });
    if (!carta) throw new NotFoundException('Carta oferta não encontrada');
    return this.prisma.cartaOferta.update({ where: { id }, data: { status } });
  }
}
