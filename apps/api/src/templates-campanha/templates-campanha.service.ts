// Servico de templates de campanha + geracao em lote (Briefing Marketing — Secao 4).
// Um template define os materiais padrao; a geracao cria, para cada cliente
// selecionado, uma CampanhaMarketing + os MaterialCampanha, ja atribuidos ao
// membro correto do squad do cliente (copywriter, primeira etapa do pipeline).
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { CriarTemplateDto } from './dto/criar-template.dto';
import { AtualizarTemplateDto } from './dto/atualizar-template.dto';
import { CriarTemplateMaterialDto, AtualizarTemplateMaterialDto } from './dto/material-template.dto';
import { GerarLoteDto, PreviewLoteDto } from './dto/gerar-lote.dto';

@Injectable()
export class TemplatesCampanhaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
  ) {}

  // Lista templates (por padrao, so os nao arquivados) com contagem de materiais.
  async listar(incluirArquivados = false) {
    const templates = await this.prisma.templateCampanha.findMany({
      where: incluirArquivados ? undefined : { arquivado: false },
      orderBy: { criadoEm: 'desc' },
      include: { materiais: { select: { id: true } } },
    });
    return templates.map((t) => ({
      id: t.id,
      nome: t.nome,
      tipoCampanha: t.tipoCampanha,
      tipoServico: t.tipoServico,
      arquivado: t.arquivado,
      codigoUnico: t.codigoUnico,
      criadoEm: t.criadoEm,
      totalMateriais: t.materiais.length,
    }));
  }

  criar(dto: CriarTemplateDto) {
    return this.prisma.templateCampanha.create({
      data: {
        nome: dto.nome.trim(),
        tipoCampanha: dto.tipoCampanha,
        tipoServico: dto.tipoServico,
        codigoUnico: this.codigoUnico.gerar('TPL'),
      },
    });
  }

  async obter(id: string) {
    const template = await this.prisma.templateCampanha.findUnique({
      where: { id },
      include: { materiais: { orderBy: { ordem: 'asc' } } },
    });
    if (!template) {
      throw new NotFoundException('Template nao encontrado');
    }
    return template;
  }

  async atualizar(id: string, dto: AtualizarTemplateDto) {
    await this.garantir(id);
    return this.prisma.templateCampanha.update({
      where: { id },
      data: {
        nome: dto.nome?.trim(),
        tipoCampanha: dto.tipoCampanha,
        tipoServico: dto.tipoServico,
        arquivado: dto.arquivado,
      },
    });
  }

  async remover(id: string) {
    await this.garantir(id);
    await this.prisma.templateCampanha.delete({ where: { id } });
    return { ok: true };
  }

  // Duplica um template (salvar variacao — Briefing Secao 4) com seus materiais.
  async duplicar(id: string) {
    const original = await this.obter(id);
    return this.prisma.templateCampanha.create({
      data: {
        nome: `${original.nome} (cópia)`,
        tipoCampanha: original.tipoCampanha,
        tipoServico: original.tipoServico,
        codigoUnico: this.codigoUnico.gerar('TPL'),
        materiais: {
          create: original.materiais.map((m) => ({
            titulo: m.titulo,
            tipo: m.tipo,
            destino: m.destino,
            ordem: m.ordem,
          })),
        },
      },
      include: { materiais: true },
    });
  }

  async adicionarMaterial(templateId: string, dto: CriarTemplateMaterialDto) {
    await this.garantir(templateId);
    return this.prisma.templateMaterial.create({
      data: {
        templateId,
        titulo: dto.titulo.trim(),
        tipo: dto.tipo,
        destino: dto.destino ?? 'TRAFEGO_PAGO',
        ordem: dto.ordem ?? 0,
      },
    });
  }

  async atualizarMaterial(materialId: string, dto: AtualizarTemplateMaterialDto) {
    const existe = await this.prisma.templateMaterial.findUnique({
      where: { id: materialId }, select: { id: true },
    });
    if (!existe) throw new NotFoundException('Material do template nao encontrado');
    return this.prisma.templateMaterial.update({
      where: { id: materialId },
      data: { titulo: dto.titulo?.trim(), tipo: dto.tipo, destino: dto.destino, ordem: dto.ordem },
    });
  }

  async removerMaterial(materialId: string) {
    const existe = await this.prisma.templateMaterial.findUnique({
      where: { id: materialId }, select: { id: true },
    });
    if (!existe) throw new NotFoundException('Material do template nao encontrado');
    await this.prisma.templateMaterial.delete({ where: { id: materialId } });
    return { ok: true };
  }

  // Preview do que sera gerado (Briefing Secao 4): por cliente e por squad.
  async preview(templateId: string, dto: PreviewLoteDto) {
    const template = await this.obter(templateId);
    const clientes = await this.buscarClientes(dto.clienteIds);
    const nMateriais = template.materiais.length;

    const porCliente = clientes.map((c) => ({
      clienteId: c.id,
      cliente: c.nomeFantasia,
      squad: c.squad?.nome ?? null,
      semSquad: !c.squadId,
      responsavel: this.copywriter(c)?.nome ?? null,
      materiais: nMateriais,
    }));
    const porSquad: Record<string, number> = {};
    for (const c of clientes) {
      const chave = c.squad?.nome ?? 'Sem squad';
      porSquad[chave] = (porSquad[chave] ?? 0) + nMateriais;
    }
    return {
      templateId,
      templateNome: template.nome,
      materiaisPorCliente: nMateriais,
      totalClientes: clientes.length,
      totalCampanhas: clientes.length,
      totalMateriais: clientes.length * nMateriais,
      porCliente,
      porSquad,
    };
  }

  // Geracao em lote: cria 1 campanha + materiais por cliente selecionado.
  async gerar(templateId: string, dto: GerarLoteDto) {
    const template = await this.obter(templateId);
    const clientes = await this.buscarClientes(dto.clienteIds);
    const prazo = dto.prazo ? new Date(dto.prazo) : undefined;
    const nome = dto.nome?.trim() || template.nome;

    let campanhasCriadas = 0;
    let materiaisCriados = 0;

    for (const c of clientes) {
      const responsavelId = this.copywriter(c)?.id ?? undefined;
      await this.prisma.campanhaMarketing.create({
        data: {
          nome,
          objetivo: null,
          situacao: 'EM_ANDAMENTO',
          prazo,
          clienteId: c.id,
          squadId: c.squadId ?? undefined,
          codigoUnico: this.codigoUnico.gerar('CMP'),
          materiais: {
            create: template.materiais.map((m) => ({
              titulo: m.titulo,
              tipo: m.tipo,
              destino: m.destino,
              prazo,
              responsavelId,
            })),
          },
        },
      });
      campanhasCriadas += 1;
      materiaisCriados += template.materiais.length;
    }

    return { ok: true, campanhasCriadas, materiaisCriados, clientes: clientes.length };
  }

  // Clientes selecionados com squad + membros (para atribuicao por funcao).
  private buscarClientes(ids: string[]) {
    return this.prisma.cliente.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nomeFantasia: true,
        squadId: true,
        squad: {
          select: {
            nome: true,
            membros: { select: { funcao: true, usuario: { select: { id: true, nome: true } } } },
          },
        },
      },
    });
  }

  // Membro copywriter do squad do cliente (1a etapa do pipeline = copy).
  private copywriter(cliente: {
    squad: { membros: { funcao: string; usuario: { id: string; nome: string } }[] } | null;
  }): { id: string; nome: string } | null {
    const m = cliente.squad?.membros.find((x) => x.funcao?.toUpperCase() === 'COPYWRITER');
    return m ? m.usuario : null;
  }

  private async garantir(id: string) {
    const t = await this.prisma.templateCampanha.findUnique({ where: { id }, select: { id: true } });
    if (!t) throw new NotFoundException('Template nao encontrado');
  }
}
