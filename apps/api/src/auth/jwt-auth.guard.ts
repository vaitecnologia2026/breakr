// Guard de autenticacao JWT — protege rotas exigindo Bearer token valido.
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
