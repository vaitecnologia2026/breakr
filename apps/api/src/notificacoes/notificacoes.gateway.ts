// ============================================================
// Gateway WebSocket de notificacoes em tempo real (Fase 0).
//
// Entrega o pop-up "novo contrato p/ a Franciela" sem polling: o front
// abre um socket no namespace '/notificacoes', se identifica com o seu
// usuarioId e passa a receber o evento 'nova-notificacao' assim que o
// NotificacoesService persiste algo para ele.
//
// AUTH (Fase 0): simplificada — o cliente informa o usuarioId via query do
// handshake (?usuarioId=...) ou via payload do evento 'identificar'. NAO ha
// validacao de token aqui ainda. Na Fase 1 o JWT deve ser validado no
// handshake (handleConnection -> client.handshake.auth.token) e o usuarioId
// extraido do token, ignorando o que o cliente enviar.
// ============================================================
import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface IdentificarPayload {
  usuarioId?: string;
}

@WebSocketGateway({
  namespace: '/notificacoes',
  cors: {
    // Reaproveita a mesma origem do CORS HTTP (web). '*' como fallback de dev.
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  },
})
export class NotificacoesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificacoesGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  /**
   * Na conexao, tentamos identificar o usuario pela query do handshake
   * (?usuarioId=...). Se vier, ja entra na room. Caso contrario, espera o
   * evento 'identificar'. (Fase 1: validar JWT do handshake aqui.)
   */
  handleConnection(client: Socket): void {
    const usuarioId = client.handshake.query?.usuarioId;
    const id = Array.isArray(usuarioId) ? usuarioId[0] : usuarioId;
    if (id) {
      this.entrarNaRoom(client, id);
      return;
    }
    this.logger.debug(
      `Cliente ${client.id} conectado sem usuarioId — aguardando 'identificar'.`,
    );
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Cliente ${client.id} desconectado.`);
  }

  /**
   * Identificacao explicita: o front emite 'identificar' com { usuarioId }.
   * Util quando o id so e conhecido depois do login no app.
   */
  @SubscribeMessage('identificar')
  identificar(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: IdentificarPayload,
  ): { ok: boolean } {
    const usuarioId = payload?.usuarioId;
    if (!usuarioId) {
      this.logger.warn(`Cliente ${client.id} enviou 'identificar' sem usuarioId.`);
      return { ok: false };
    }
    this.entrarNaRoom(client, usuarioId);
    return { ok: true };
  }

  /**
   * Emite uma notificacao para todas as conexoes do usuario (a room e o
   * proprio usuarioId). Chamado pelo NotificacoesService apos persistir.
   */
  emitirParaUsuario(usuarioId: string, notificacao: unknown): void {
    this.server.to(usuarioId).emit('nova-notificacao', notificacao);
  }

  // Coloca o socket na room do usuario (1 room por usuarioId).
  private entrarNaRoom(client: Socket, usuarioId: string): void {
    void client.join(usuarioId);
    this.logger.debug(`Cliente ${client.id} entrou na room '${usuarioId}'.`);
  }
}
