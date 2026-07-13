// ============================================================
// Ports (contratos) das integracoes externas — doc 04-integracoes.md.
//
// Cada integracao e um adapter isolado atras de uma interface unica. O resto
// do sistema (motor, regras, controllers) depende APENAS destas interfaces, e
// nunca da implementacao concreta. Hoje todas tem implementacao STUB; a real
// entra quando houver credencial no cofre (env / IntegrationCredential).
//
// Regra de centralizacao (doc 04): todo retorno relevante (asaas_id, link da
// NF, id do contrato, wa_group_id...) deve ser salvo no nosso banco pelo
// chamador. Estes contratos apenas devolvem esses dados; persistir e papel de
// quem consome.
// ============================================================

// ---------------------------------------------------------------
// 1. ASAAS — cobranca / financeiro
// ---------------------------------------------------------------
export interface AsaasCobrancaInput {
  clienteId: string; // id do cliente no Asaas (asaas_id)
  valor: number; // em reais
  vencimento: string; // ISO date (YYYY-MM-DD)
  descricao?: string;
  // BOLETO | PIX | CREDIT_CARD — formas suportadas pelo Asaas.
  formaPagamento?: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
}

export interface AsaasCobranca {
  id: string; // asaas_id da cobranca
  status: string; // PENDING | RECEIVED | OVERDUE...
  valor: number;
  vencimento: string;
  linkBoleto?: string;
  pixCopiaECola?: string;
}

export interface AsaasPort {
  /** Cria uma cobranca (boleto/PIX/cartao) para um cliente. */
  criarCobranca(input: AsaasCobrancaInput): Promise<AsaasCobranca>;

  /** Consulta boletos/cobrancas, opcionalmente filtrando por status. */
  consultarBoletos(filtro?: {
    status?: string;
    clienteId?: string;
  }): Promise<AsaasCobranca[]>;
}

// ---------------------------------------------------------------
// 2. Speed — Nota Fiscal (NF-e)
// ---------------------------------------------------------------
export interface SpeedNotaInput {
  clienteId: string;
  valor: number;
  descricaoServico: string;
}

export interface SpeedNota {
  id: string; // speed_id
  status: string; // PROCESSANDO | EMITIDA | ERRO
  linkPdf?: string;
}

export interface SpeedPort {
  /** Emite uma NF-e (disparado pela regra "Liberar Onboarding Apos Pagamento"). */
  emitirNota(input: SpeedNotaInput): Promise<SpeedNota>;
}

// ---------------------------------------------------------------
// 3. Autentique — assinatura eletronica
// ---------------------------------------------------------------
export interface AutentiqueAssinaturaInput {
  nomeDocumento: string;
  // Conteudo do PDF (base64) ou URL acessivel pelo Autentique.
  pdfBase64?: string;
  pdfUrl?: string;
  // Envio de arquivo generico (ex.: .docx do contrato) via multipart `file`.
  // Quando presente, tem prioridade sobre pdfBase64/pdfUrl.
  arquivoBase64?: string;
  nomeArquivo?: string;
  mimeType?: string;
  // Mensagem exibida ao signatario (opcional).
  mensagem?: string;
  signatarios: Array<{ nome: string; email: string }>;
}

export interface AutentiqueDocumento {
  id: string; // id do documento no Autentique
  status: string; // PENDENTE | ASSINADO | RECUSADO
  linkAssinatura?: string;
}

export interface AutentiquePort {
  /** Envia um contrato (PDF) para assinatura; retorno de assinado vem por webhook. */
  enviarParaAssinatura(
    input: AutentiqueAssinaturaInput,
  ): Promise<AutentiqueDocumento>;
}

// ---------------------------------------------------------------
// 4. WhatsApp — API oficial
// ---------------------------------------------------------------
export interface WhatsappMensagemInput {
  // Numero E.164 (ex.: 5598999999999) ou id de grupo (...@g.us).
  destino: string;
  texto?: string;
  // Anexo opcional (boleto/PIX/peca) por URL.
  midiaUrl?: string;
  // Nome do template aprovado (quando envio fora da janela de 24h).
  template?: string;
}

export interface WhatsappMensagem {
  id: string; // id da mensagem
  status: string; // ENVIADA | ENTREGUE | LIDA | FALHA
}

export interface WhatsappGrupoInput {
  nome: string;
  // Participantes em E.164 (ex.: cliente + CS como admin).
  participantes: string[];
  descricao?: string;
}

export interface WhatsappGrupo {
  waGroupId: string; // ...@g.us
  nome: string;
}

export interface WhatsappPort {
  /** Envia texto/midia/template para um numero ou grupo. */
  enviarMensagem(input: WhatsappMensagemInput): Promise<WhatsappMensagem>;

  /** Cria o grupo do cliente (e adiciona o CS como admin). */
  criarGrupo(input: WhatsappGrupoInput): Promise<WhatsappGrupo>;
}

// ---------------------------------------------------------------
// 5. Google Meet — videoconferência (reunião de demonstração/onboarding)
// ---------------------------------------------------------------
export interface GoogleMeetInput {
  titulo: string;
  // ISO datetime (ex.: 2026-06-20T10:00:00-03:00)
  inicio: string;
  // Duração em minutos (padrão: 60)
  duracaoMinutos?: number;
  convidados?: string[]; // e-mails
}

export interface GoogleMeetLink {
  meetLink: string; // https://meet.google.com/xxx-yyyy-zzz
  eventoId: string; // id do evento no Google Calendar
}

export interface GoogleMeetPort {
  /** Cria um evento com Google Meet e retorna o link. */
  criarMeet(input: GoogleMeetInput): Promise<GoogleMeetLink>;
}
