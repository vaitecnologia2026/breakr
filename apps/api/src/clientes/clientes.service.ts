// Servico de clientes — master-data do nucleo.
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Cliente, TipoProjeto } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { DefinirAcessoPortalDto } from './dto/definir-acesso-portal.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
  ) {}

  // Lista todos os clientes (mais recentes primeiro) com progresso de onboarding.
  listar() {
    return this.prisma.cliente.findMany({
      orderBy: { criadoEm: 'desc' },
      include: {
        squad: true,
        plano: true,
        onboarding: { select: { progresso: true, concluido: true } },
      },
    });
  }

  // Busca um cliente pelo id.
  async buscarPorId(id: string): Promise<Cliente> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: { squad: true, plano: true },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado');
    }
    return cliente;
  }

  // Cria cliente com status NOVO e codigo unico gerado (prefixo CLI).
  criar(dto: CriarClienteDto): Promise<Cliente> {
    return this.prisma.cliente.create({
      data: {
        nomeFantasia: this.padronizarNome(dto.nomeFantasia),
        cnpj: dto.cnpj,
        tag: dto.tag,
        email: dto.email,
        telefone: dto.telefone,
        planoId: dto.planoId,
        squadId: dto.squadId,
        // Pilares contratados (Briefing Marketing) — default vazio.
        pilares: (dto.pilares as TipoProjeto[] | undefined) ?? [],
        status: ClienteStatus.NOVO,
        codigoUnico: this.codigoUnico.gerar('CLI'),
      },
    });
  }

  // Atualiza campos do cliente (so os enviados).
  async atualizar(id: string, dto: AtualizarClienteDto): Promise<Cliente> {
    const atual = await this.buscarPorId(id);
    // Plano obrigatorio antes de confirmar a producao (req. l.54): mover o cliente
    // para producao (ONBOARD/ATIVO/RENOVACAO) exige plano definido — ele determina
    // os projetos a criar e o valor da fatura. Na criacao o plano pode ficar em aberto.
    const STATUS_PRODUCAO: ClienteStatus[] = [
      ClienteStatus.ONBOARD,
      ClienteStatus.ATIVO,
      ClienteStatus.RENOVACAO,
    ];
    if (dto.status && STATUS_PRODUCAO.includes(dto.status)) {
      const planoEfetivo = dto.planoId ?? atual.planoId;
      if (!planoEfetivo) {
        throw new BadRequestException(
          'Selecione o plano do cliente antes de confirmar a producao (o plano define os projetos e o valor da fatura).',
        );
      }
    }

    // Troca de squad registrada com historico (Briefing Marketing — Secao 2).
    // So registra quando o squadId foi enviado E de fato mudou.
    if (dto.squadId !== undefined && dto.squadId !== atual.squadId) {
      await this.registrarTrocaSquad(id, atual.squadId, dto.squadId);
    }

    return this.prisma.cliente.update({
      where: { id },
      data: {
        nomeFantasia:
          dto.nomeFantasia !== undefined ? this.padronizarNome(dto.nomeFantasia) : undefined,
        cnpj: dto.cnpj,
        tag: dto.tag,
        email: dto.email,
        telefone: dto.telefone,
        status: dto.status,
        squadId: dto.squadId,
        planoId: dto.planoId,
        linkAreaMembros: dto.linkAreaMembros,
        // Pilares contratados (Briefing Marketing) — so atualiza se enviado.
        pilares: dto.pilares !== undefined ? (dto.pilares as TipoProjeto[]) : undefined,
      },
    });
  }

  // Registra uma troca de squad do cliente (de -> para), guardando os nomes para
  // o historico ficar legivel mesmo se o squad for renomeado depois.
  private async registrarTrocaSquad(
    clienteId: string,
    deSquadId: string | null,
    paraSquadId: string | null,
  ): Promise<void> {
    const [de, para] = await Promise.all([
      deSquadId
        ? this.prisma.squad.findUnique({ where: { id: deSquadId }, select: { nome: true } })
        : Promise.resolve(null),
      paraSquadId
        ? this.prisma.squad.findUnique({ where: { id: paraSquadId }, select: { nome: true } })
        : Promise.resolve(null),
    ]);
    await this.prisma.historicoSquadCliente.create({
      data: {
        clienteId,
        deSquadId: deSquadId ?? null,
        deSquadNome: de?.nome ?? null,
        paraSquadId: paraSquadId ?? null,
        paraSquadNome: para?.nome ?? null,
      },
    });
  }

  // Lista o historico de troca de squad de um cliente (mais recente primeiro).
  historicoSquad(clienteId: string) {
    return this.prisma.historicoSquadCliente.findMany({
      where: { clienteId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // ─── Acesso do cliente ao portal (tela "Usuarios") ───────────────────────────
  // Status do acesso de uma empresa. Nunca devolve o hash da senha.
  async obterAcessoPortal(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: {
        nomeFantasia: true,
        codigoUnico: true,
        portalUsuario: true,
        portalSenhaHash: true,
      },
    });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');
    return {
      nomeFantasia: cliente.nomeFantasia,
      codigoUnico: cliente.codigoUnico,
      usuario: cliente.portalUsuario,
      temAcesso: cliente.portalSenhaHash != null,
    };
  }

  // Define (cria ou substitui) o usuario+senha de acesso do cliente ao portal.
  // O usuario e unico entre empresas; a senha e guardada com hash bcrypt.
  async definirAcessoPortal(id: string, dto: DefinirAcessoPortalDto) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');

    const usuario = dto.usuario.trim();
    // Unicidade do usuario entre empresas (case-insensitive), ignorando a propria.
    const emUso = await this.prisma.cliente.findFirst({
      where: {
        portalUsuario: { equals: usuario, mode: 'insensitive' },
        NOT: { id },
      },
      select: { id: true },
    });
    if (emUso) {
      throw new ConflictException('Este usuario ja esta em uso por outra empresa');
    }

    const portalSenhaHash = await bcrypt.hash(dto.senha, 10);
    const atualizado = await this.prisma.cliente.update({
      where: { id },
      data: { portalUsuario: usuario, portalSenhaHash },
      select: { nomeFantasia: true, codigoUnico: true, portalUsuario: true },
    });
    return {
      nomeFantasia: atualizado.nomeFantasia,
      codigoUnico: atualizado.codigoUnico,
      usuario: atualizado.portalUsuario,
      temAcesso: true,
    };
  }

  // Remove o acesso (volta o portal da empresa a ser publico por link).
  async removerAcessoPortal(id: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');
    const atualizado = await this.prisma.cliente.update({
      where: { id },
      data: { portalUsuario: null, portalSenhaHash: null },
      select: { nomeFantasia: true, codigoUnico: true },
    });
    return {
      nomeFantasia: atualizado.nomeFantasia,
      codigoUnico: atualizado.codigoUnico,
      usuario: null,
      temAcesso: false,
    };
  }

  // Padroniza o nome do cliente em title case (primeira letra de cada palavra em
  // maiuscula) — req. l.55: o cliente padroniza manualmente e "tem horror de letra
  // minuscula"; o sistema faz isso automaticamente. Preserva o restante de cada
  // palavra para nao destruir siglas/acronimos ja em maiuscula (ex.: "JD Burger").
  private padronizarNome(nome: string): string {
    return nome
      .trim()
      .split(/\s+/)
      .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
      .join(' ');
  }
}
