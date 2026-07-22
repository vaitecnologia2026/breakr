import { Module } from '@nestjs/common';
import { MidiaController } from './midia.controller';

// Modulo de upload de midia generico (imagem/video/audio/documento) usado pelo
// editor de texto rico. Sem service/DB: o controller salva em disco e devolve a URL.
@Module({ controllers: [MidiaController] })
export class MidiaModule {}
