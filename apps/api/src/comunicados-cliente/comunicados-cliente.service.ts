// Serviço de comunicados aos clientes (banner no portal de cada cliente).
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComunicadosClienteService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.comunicadoCliente.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  criar(mensagem: string) {
    return this.prisma.comunicadoCliente.create({ data: { mensagem } });
  }

  async desativar(id: string) {
    const c = await this.prisma.comunicadoCliente.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Comunicado nao encontrado');
    return this.prisma.comunicadoCliente.update({ where: { id }, data: { ativo: false } });
  }
}
