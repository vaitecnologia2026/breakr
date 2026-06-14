// Controller de projetos (somente leitura — a criacao e automatica no pipeline).
import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjetosService } from './projetos.service';

@Controller('projetos')
@UseGuards(JwtAuthGuard)
export class ProjetosController {
  constructor(private readonly projetosService: ProjetosService) {}

  // GET /projetos — lista todos (qualquer autenticado).
  @Get()
  listar() {
    return this.projetosService.listar();
  }

  // GET /projetos/cliente/:id — projetos de um cliente.
  @Get('cliente/:id')
  listarPorCliente(@Param('id', ParseUUIDPipe) id: string) {
    return this.projetosService.listarPorCliente(id);
  }
}
