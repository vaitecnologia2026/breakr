// Controller de upload de midia generico (imagem, video, audio ou documento).
// Salva o arquivo em disco (mesmo UPLOAD_DIR do conteudo, servido em /uploads pelo
// main.ts) e devolve a URL publica. Nao grava no banco — apenas retorna a URL, para
// o editor de texto rico (Modelos de Mensagem) inserir a midia por referencia.
import {
  BadRequestException,
  Controller,
  Post,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Limite de upload: 20 MB (mesmo do upload de midia do conteudo).
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// Diretorio de uploads (mesmo do main.ts / conteudos): env ou apps/api/uploads.
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
// Documentos aceitos alem de image/*, video/* e audio/* (pdf, word, excel, ppt, txt, csv).
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

@Controller('midia')
@UseGuards(JwtAuthGuard)
export class MidiaController {
  // POST /midia/upload — upload de imagem, video, audio ou documento (ate 20 MB).
  // Campo do form: "arquivo". Devolve { url, mimetype, nome }.
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
    @UploadedFile()
    arquivo:
      | { originalname: string; mimetype: string; size: number; buffer: Buffer }
      | undefined,
    @Req() req: Request,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado (campo "arquivo").');
    }
    // SVG pode carregar script; bloqueado por seguranca (servimos os arquivos estaticamente).
    if (arquivo.mimetype === 'image/svg+xml') {
      throw new BadRequestException('Imagens SVG nao sao permitidas.');
    }
    const permitido =
      arquivo.mimetype.startsWith('image/') ||
      arquivo.mimetype.startsWith('video/') ||
      arquivo.mimetype.startsWith('audio/') ||
      TIPOS_DOC_PERMITIDOS.includes(arquivo.mimetype);
    if (!permitido) {
      throw new BadRequestException(
        'Tipo de arquivo nao permitido. Envie imagem, video, audio ou documento (pdf, doc, xls, ppt, txt, csv).',
      );
    }

    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = extname(arquivo.originalname).toLowerCase().slice(0, 12);
    const nomeArquivo = `${randomUUID()}${ext}`;
    writeFileSync(join(UPLOAD_DIR, nomeArquivo), arquivo.buffer);

    // Respeita o proxy (X-Forwarded-Proto) para devolver https em producao.
    const proto =
      (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() ||
      req.protocol;
    const url = `${proto}://${req.get('host')}/uploads/${nomeArquivo}`;
    return { url, mimetype: arquivo.mimetype, nome: arquivo.originalname };
  }
}
