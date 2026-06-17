// Módulo de medalhas (gamificação do portal do cliente).
import { Module } from '@nestjs/common';
import { MedalhasService } from './medalhas.service';
import { MedalhasController } from './medalhas.controller';

@Module({
  controllers: [MedalhasController],
  providers: [MedalhasService],
})
export class MedalhasModule {}
