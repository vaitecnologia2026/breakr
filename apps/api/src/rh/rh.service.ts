// Servico de RH — recrutamento e selecao (M19). Cada Vaga reune Candidatos que
// percorrem o funil de selecao (INSCRITO ate APROVADO/REPROVADO).
import { Injectable, NotFoundException } from '@nestjs/common';
import { Candidato, Prisma, StatusCandidato, Vaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { CriarVagaDto } from './dto/criar-vaga.dto';
import { CriarCandidatoDto } from './dto/criar-candidato.dto';

@Injectable()
export class RhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
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
}
