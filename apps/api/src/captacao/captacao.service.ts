// Serviço de captação de dados (jurídico) — formulário público que o cliente
// preenche após o "sim". Cria o Cliente (NOVO) + um Contrato (RASCUNHO) para a
// equipe jurídica revisar e enviar para assinatura. Centraliza a entrada que
// antes vinha por um formulário externo + N8N.
import { Injectable } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import { ContratosService } from '../contratos/contratos.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { SubmeterCaptacaoDto } from './dto/submeter-captacao.dto';

@Injectable()
export class CaptacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientes: ClientesService,
    private readonly contratos: ContratosService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // Planos ativos para o formulário (público — só dados não sensíveis).
  async planos() {
    const planos = await this.prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { valor: 'asc' },
      select: { id: true, nome: true, valor: true },
    });
    return planos.map((p) => ({ id: p.id, nome: p.nome, valor: p.valor.toString() }));
  }

  async submeter(dto: SubmeterCaptacaoDto) {
    // Cria o cliente (NOVO) com o plano escolhido.
    const cliente = await this.clientes.criar({
      nomeFantasia: dto.nomeFantasia.trim(),
      cnpj: dto.cnpj,
      email: dto.email,
      telefone: dto.telefone,
      planoId: dto.planoId,
    });

    // Gera o contrato em rascunho (valor derivado do plano) para revisão.
    const contrato = await this.contratos.criar({
      clienteId: cliente.id,
      planoId: dto.planoId,
    });

    // Avisa o jurídico para revisar e liberar o contrato para assinatura.
    await this.notificacoes.notificarPorCargo(Cargo.JURIDICO, {
      titulo: 'Nova captação — contrato para revisar',
      mensagem: `${cliente.nomeFantasia} preencheu a captação. Contrato ${contrato.codigoUnico} criado em rascunho.`,
      tipo: 'ALERTA',
      link: '/contratos',
    });

    return { ok: true, clienteId: cliente.id, contratoId: contrato.id };
  }
}
