// Controller de reuniões internas do time.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReunioesService } from './reunioes.service';
import { CriarReuniaoDto } from './dto/criar-reuniao.dto';

@Controller('reunioes-internas')
@UseGuards(JwtAuthGuard)
export class ReunioesController {
  constructor(private readonly reunioes: ReunioesService) {}

  @Get()
  listar() {
    return this.reunioes.listar();
  }

  @Post()
  criar(@Body() dto: CriarReuniaoDto) {
    return this.reunioes.criar(dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.reunioes.remover(id);
  }
}
