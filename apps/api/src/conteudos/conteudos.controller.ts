// Controller do funil de producao de conteudo (M16).
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { StatusConteudo } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ConteudosService } from './conteudos.service';
import { CriarConteudoDto } from './dto/criar-conteudo.dto';
import { MoverStatusDto } from './dto/mover-status.dto';
import { AtribuirResponsavelDto } from './dto/atribuir-responsavel.dto';
import { SolicitarCriativoDto } from './dto/solicitar-criativo.dto';
import { AtualizarMidiaDto } from './dto/atualizar-midia.dto';

// Time de produção que pode operar o funil de conteúdo.
const TIME_CONTEUDO = [
  Cargo.SUPERADMIN,
  Cargo.ADMIN,
  Cargo.ESTRATEGISTA,
  Cargo.CS,
  Cargo.COPYWRITER,
  Cargo.DESIGNER,
  Cargo.EDITOR_VIDEO,
] as const;

// Limite de upload de midia: 20 MB.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// Diretorio de uploads (mesmo do main.ts): env ou apps/api/uploads.
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
// Documentos aceitos alem de image/* e video/* (pdf, word, excel, ppt, txt, csv).
const TIPOS_DOC_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

@Controller('conteudos')
@UseGuards(JwtAuthGuard)
export class ConteudosController {
  constructor(private readonly conteudosService: ConteudosService) {}

  // GET /conteudos — lista (qualquer autenticado), com filtros opcionais.
  @Get()
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: StatusConteudo,
  ) {
    return this.conteudosService.listar({ clienteId, status });
  }

  // GET /conteudos/:id — detalhe (qualquer autenticado).
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.conteudosService.obter(id);
  }

  // POST /conteudos — cria peca (time de producao/estrategia/CS/Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  criar(@Body() dto: CriarConteudoDto) {
    return this.conteudosService.criar(dto);
  }

  // POST /conteudos/solicitar — gestor de tráfego pede um criativo à estrategista.
  @Post('solicitar')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.GESTOR_TRAFEGO, Cargo.ESTRATEGISTA)
  solicitar(@Body() dto: SolicitarCriativoDto) {
    return this.conteudosService.solicitarCriativo(dto);
  }

  // POST /conteudos/:id/encaminhar-design — handoff copy→design (marca o designer).
  @Post(':id/encaminhar-design')
  @UseGuards(CargosGuard)
  @Cargos(...TIME_CONTEUDO)
  encaminharParaDesign(@Param('id', ParseUUIDPipe) id: string) {
    return this.conteudosService.encaminharParaDesign(id);
  }

  // PATCH /conteudos/:id/status — move a peca no funil (mesmo time).
  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  moverStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverStatusDto,
  ) {
    return this.conteudosService.moverStatus(id, dto.status);
  }

  // PATCH /conteudos/:id/responsavel — atribui responsavel (mesmo time).
  @Patch(':id/responsavel')
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  atribuirResponsavel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtribuirResponsavelDto,
  ) {
    return this.conteudosService.atribuirResponsavel(id, dto.responsavelId);
  }

  // PATCH /conteudos/:id/midia — anexa/atualiza a URL da mídia da peça (mesmo time).
  @Patch(':id/midia')
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  atualizarMidia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarMidiaDto,
  ) {
    return this.conteudosService.atualizarMidia(id, dto.midiaUrl);
  }

  // POST /conteudos/:id/midia/upload — upload de arquivo de midia (imagem, video
  // ou documento) ate 20 MB. Alternativa ao anexo por link (PATCH .../midia).
  // O arquivo e salvo em disco e servido em /uploads; a URL publica vira a midiaUrl.
  @Post(':id/midia/upload')
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  uploadMidia(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile()
    arquivo:
      | { originalname: string; mimetype: string; size: number; buffer: Buffer }
      | undefined,
    @Req() req: Request,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado (campo "arquivo").');
    }
    const permitido =
      arquivo.mimetype.startsWith('image/') ||
      arquivo.mimetype.startsWith('video/') ||
      TIPOS_DOC_PERMITIDOS.includes(arquivo.mimetype);
    if (!permitido) {
      throw new BadRequestException(
        'Tipo de arquivo nao permitido. Envie imagem, video ou documento (pdf, doc, xls, ppt, txt, csv).',
      );
    }

    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = extname(arquivo.originalname).toLowerCase().slice(0, 12);
    const nomeArquivo = `${randomUUID()}${ext}`;
    writeFileSync(join(UPLOAD_DIR, nomeArquivo), arquivo.buffer);

    const base = `${req.protocol}://${req.get('host')}`;
    const url = `${base}/uploads/${nomeArquivo}`;
    return this.conteudosService.atualizarMidia(id, url);
  }
}
