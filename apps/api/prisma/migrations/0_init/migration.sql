-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('SUPERADMIN', 'ADMIN', 'COMERCIAL', 'CS', 'ESTRATEGISTA', 'COPYWRITER', 'DESIGNER', 'EDITOR_VIDEO', 'GESTOR_TRAFEGO', 'FINANCEIRO', 'JURIDICO');

-- CreateEnum
CREATE TYPE "FuncaoSquad" AS ENUM ('CS', 'ESTRATEGISTA', 'COPYWRITER', 'DESIGNER', 'EDITOR_VIDEO', 'GESTOR_TRAFEGO');

-- CreateEnum
CREATE TYPE "ClienteStatus" AS ENUM ('NOVO', 'ONBOARD', 'ATIVO', 'RENOVACAO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipoProjeto" AS ENUM ('MARKETING', 'GESTAO', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('RASCUNHO', 'AGUARDANDO_ASSINATURA', 'EM_REVISAO', 'EM_VIGOR', 'RENOVACAO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "StatusLead" AS ENUM ('NOVO', 'CONTATADO', 'QUALIFICADO', 'PROPOSTA', 'GANHO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "TipoConteudo" AS ENUM ('POST', 'REELS', 'STORY', 'CARROSSEL', 'VIDEO', 'ARTIGO');

-- CreateEnum
CREATE TYPE "StatusConteudo" AS ENUM ('IDEIA', 'ROTEIRO', 'PRODUCAO', 'REVISAO', 'EM_ALTERACAO', 'APROVACAO_CLIENTE', 'AGENDADO', 'LABORATORIO', 'PUBLICADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "StatusCandidato" AS ENUM ('INSCRITO', 'TRIAGEM', 'ENTREVISTA', 'TESTE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "StatusCompra" AS ENUM ('SOLICITADA', 'APROVADA', 'COMPRADA', 'RECEBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SeveridadeBug" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "StatusBug" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'EM_REVISAO', 'RESOLVIDO', 'FECHADO');

-- CreateEnum
CREATE TYPE "StatusCampanha" AS ENUM ('RASCUNHO', 'ATIVA', 'PAUSADA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "ProvedorIa" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI');

-- CreateEnum
CREATE TYPE "StatusConversa" AS ENUM ('PENDENTE', 'ATENDENDO', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "TipoCanal" AS ENUM ('PUBLICO', 'PRIVADO');

-- CreateTable
CREATE TABLE "config" (
    "id" TEXT NOT NULL,
    "branding" JSONB,
    "parametros" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "cargo" "Cargo" NOT NULL,
    "telefone" TEXT,
    "foto_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "departamento_id" TEXT,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "departamento_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "area_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_membro" (
    "id" TEXT NOT NULL,
    "squad_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "funcao" "FuncaoSquad" NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "squad_membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "tag" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "status" "ClienteStatus" NOT NULL DEFAULT 'NOVO',
    "codigo_unico" TEXT NOT NULL,
    "ticket_medio" DECIMAL(12,2),
    "orcamento_mensal" DECIMAL(12,2),
    "link_area_membros" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "squad_id" TEXT,
    "plano_id" TEXT,
    "whatsapp_grupo_id" TEXT,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "ciclo" TEXT NOT NULL DEFAULT 'MENSAL',
    "entregaveis" JSONB,
    "tiposProjeto" "TipoProjeto"[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automacao_rule" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "trigger" JSONB NOT NULL,
    "condicoes" JSONB,
    "acoes" JSONB NOT NULL,
    "parametros" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automacao_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_execution" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "payload" JSONB,
    "resultado" JSONB,
    "erro" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rule_id" TEXT,

    CONSTRAINT "job_execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "ator" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "dados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato" (
    "id" TEXT NOT NULL,
    "status" "StatusContrato" NOT NULL DEFAULT 'RASCUNHO',
    "valor_mensal" DECIMAL(12,2) NOT NULL,
    "codigo_unico" TEXT NOT NULL,
    "doc_url" TEXT,
    "autentique_id" TEXT,
    "data_inicio" TIMESTAMP(3),
    "vencimento" TIMESTAMP(3),
    "renovacao_automatica" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "plano_id" TEXT,

    CONSTRAINT "contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fatura" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusFatura" NOT NULL DEFAULT 'PENDENTE',
    "asaas_id" TEXT,
    "meio" TEXT,
    "nota_fiscal_id" TEXT,
    "nota_fiscal_url" TEXT,
    "enviada_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "codigo_unico" TEXT NOT NULL,
    "paga_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,

    CONSTRAINT "fatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projeto" (
    "id" TEXT NOT NULL,
    "tipo" "TipoProjeto" NOT NULL,
    "nome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "codigo_unico" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding" (
    "id" TEXT NOT NULL,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_step" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "link" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboarding_id" TEXT NOT NULL,

    CONSTRAINT "onboarding_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_evento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "o_que_levar" TEXT,
    "meet_link" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "onboarding_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "video_url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula_conclusao" (
    "id" TEXT NOT NULL,
    "concluida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aula_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "aula_conclusao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "origem" TEXT,
    "status" "StatusLead" NOT NULL DEFAULT 'NOVO',
    "valor_estimado" DECIMAL(12,2),
    "observacao" TEXT,
    "codigo_unico" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "responsavel_id" TEXT,
    "cliente_id" TEXT,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudo" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoConteudo" NOT NULL DEFAULT 'POST',
    "status" "StatusConteudo" NOT NULL DEFAULT 'IDEIA',
    "codigo_unico" TEXT NOT NULL,
    "data_agendada" TIMESTAMP(3),
    "para_trafego" BOOLEAN NOT NULL DEFAULT false,
    "estrelas" INTEGER,
    "comentario_cliente" TEXT,
    "aprovado_em" TIMESTAMP(3),
    "rework_count" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "squad_id" TEXT,
    "responsavel_id" TEXT,

    CONSTRAINT "conteudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacao" (
    "id" TEXT NOT NULL,
    "qualidade_grafica" INTEGER,
    "qualidade_texto" INTEGER,
    "facilidade_aprovar" INTEGER,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conteudo_id" TEXT NOT NULL,
    "responsavel_id" TEXT,

    CONSTRAINT "avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rework_log" (
    "id" TEXT NOT NULL,
    "status_de" TEXT NOT NULL,
    "status_para" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conteudo_id" TEXT NOT NULL,

    CONSTRAINT "rework_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaga" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "departamento" TEXT,
    "descricao" TEXT,
    "aberta" BOOLEAN NOT NULL DEFAULT true,
    "codigo_unico" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "status" "StatusCandidato" NOT NULL DEFAULT 'INSCRITO',
    "perfil_disc" TEXT,
    "curriculo_url" TEXT,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "vaga_id" TEXT NOT NULL,

    CONSTRAINT "candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disc_pergunta" (
    "id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "enunciado" TEXT,
    "opcoes" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disc_pergunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "fornecedor" TEXT,
    "status" "StatusCompra" NOT NULL DEFAULT 'SOLICITADA',
    "codigo_unico" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "solicitante_id" TEXT,

    CONSTRAINT "compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "severidade" "SeveridadeBug" NOT NULL DEFAULT 'MEDIA',
    "status" "StatusBug" NOT NULL DEFAULT 'ABERTO',
    "codigo_unico" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "responsavel_id" TEXT,

    CONSTRAINT "bug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanha" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "objetivo" TEXT,
    "status" "StatusCampanha" NOT NULL DEFAULT 'RASCUNHO',
    "orcamento_diario" DECIMAL(12,2),
    "gasto" DECIMAL(12,2),
    "impressoes" INTEGER NOT NULL DEFAULT 0,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "conversoes" INTEGER NOT NULL DEFAULT 0,
    "codigo_unico" TEXT NOT NULL,
    "sugestoes_ia" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "campanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otimizacao_campanha" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "resultado" TEXT,
    "duracao_minutos" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campanha_id" TEXT NOT NULL,
    "autor_id" TEXT,

    CONSTRAINT "otimizacao_campanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_whatsapp" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "phone_number_id" TEXT,
    "access_token" TEXT,
    "webhook_verify_token" TEXT,
    "waba_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversa" (
    "id" TEXT NOT NULL,
    "status" "StatusConversa" NOT NULL DEFAULT 'PENDENTE',
    "wa_telefone" TEXT,
    "assunto" TEXT,
    "ultima_msg_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT,
    "atendente_id" TEXT,

    CONSTRAINT "conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagem" (
    "id" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "direcao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'text',
    "texto" TEXT,
    "arquivo_url" TEXT,
    "wa_msg_id" TEXT,
    "entregue_em" TIMESTAMP(3),
    "lido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversa_id" TEXT NOT NULL,

    CONSTRAINT "mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_log" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "conversa_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicado" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "autor_id" TEXT,

    CONSTRAINT "comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canal_chat" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoCanal" NOT NULL DEFAULT 'PUBLICO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canal_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagem_chat" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editado_em" TIMESTAMP(3),
    "canal_id" TEXT NOT NULL,
    "autor_id" TEXT,

    CONSTRAINT "mensagem_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_ia" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "provedorAtivo" "ProvedorIa" NOT NULL DEFAULT 'ANTHROPIC',
    "openai_api_key" TEXT,
    "anthropic_api_key" TEXT,
    "gemini_api_key" TEXT,
    "modelo_openai" TEXT,
    "modelo_anthropic" TEXT,
    "modelo_gemini" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reuniao_interna" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "meet_link" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'OUTRO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reuniao_interna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicado_cliente" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicado_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_inventario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(12,2),
    "nota_fiscal_url" TEXT,
    "plaqueta" TEXT,
    "recebido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel_id" TEXT,

    CONSTRAINT "item_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ouvidoria" (
    "id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "anonima" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "resolucao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autor_id" TEXT,

    CONSTRAINT "ouvidoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_trimestre" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "periodo" TEXT NOT NULL,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_trimestre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta_enps" (
    "id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resposta_enps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feriado" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "titulo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feriado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento_sala" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel_id" TEXT,

    CONSTRAINT "agendamento_sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_office" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "home_office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento_colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "assunto" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaborador_id" TEXT NOT NULL,

    CONSTRAINT "agendamento_colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medalha" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "icone" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medalha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_medalha" (
    "id" TEXT NOT NULL,
    "concedida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medalha_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "cliente_medalha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regra_otimizacao" (
    "id" TEXT NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "objetivo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regra_otimizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterio_avaliacao" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "criterio_avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conta_pagar" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pago_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conta_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_colaborador" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "competencia" TEXT,
    "assinado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaborador_id" TEXT NOT NULL,

    CONSTRAINT "documento_colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacao_desempenho" (
    "id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "nota" INTEGER,
    "comentario" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaborador_id" TEXT NOT NULL,
    "avaliador_id" TEXT,

    CONSTRAINT "avaliacao_desempenho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curso_educacional" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "url" TEXT NOT NULL,
    "plataforma" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curso_educacional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_departamento_id_idx" ON "usuario"("departamento_id");

-- CreateIndex
CREATE UNIQUE INDEX "departamento_nome_key" ON "departamento"("nome");

-- CreateIndex
CREATE INDEX "area_departamento_id_idx" ON "area"("departamento_id");

-- CreateIndex
CREATE INDEX "lista_area_id_idx" ON "lista"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "squad_nome_key" ON "squad"("nome");

-- CreateIndex
CREATE INDEX "squad_membro_usuario_id_idx" ON "squad_membro"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "squad_membro_squad_id_funcao_key" ON "squad_membro"("squad_id", "funcao");

-- CreateIndex
CREATE UNIQUE INDEX "squad_membro_squad_id_usuario_id_key" ON "squad_membro"("squad_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_codigo_unico_key" ON "cliente"("codigo_unico");

-- CreateIndex
CREATE INDEX "cliente_squad_id_idx" ON "cliente"("squad_id");

-- CreateIndex
CREATE INDEX "cliente_status_idx" ON "cliente"("status");

-- CreateIndex
CREATE UNIQUE INDEX "plano_nome_key" ON "plano"("nome");

-- CreateIndex
CREATE INDEX "automacao_rule_ativa_idx" ON "automacao_rule"("ativa");

-- CreateIndex
CREATE INDEX "job_execution_rule_id_idx" ON "job_execution"("rule_id");

-- CreateIndex
CREATE INDEX "job_execution_status_idx" ON "job_execution"("status");

-- CreateIndex
CREATE INDEX "audit_log_entidade_idx" ON "audit_log"("entidade");

-- CreateIndex
CREATE INDEX "audit_log_ator_idx" ON "audit_log"("ator");

-- CreateIndex
CREATE INDEX "notificacao_usuario_id_lida_idx" ON "notificacao"("usuario_id", "lida");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_codigo_unico_key" ON "contrato"("codigo_unico");

-- CreateIndex
CREATE INDEX "contrato_cliente_id_idx" ON "contrato"("cliente_id");

-- CreateIndex
CREATE INDEX "contrato_status_idx" ON "contrato"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fatura_codigo_unico_key" ON "fatura"("codigo_unico");

-- CreateIndex
CREATE INDEX "fatura_cliente_id_idx" ON "fatura"("cliente_id");

-- CreateIndex
CREATE INDEX "fatura_contrato_id_idx" ON "fatura"("contrato_id");

-- CreateIndex
CREATE INDEX "fatura_status_idx" ON "fatura"("status");

-- CreateIndex
CREATE UNIQUE INDEX "projeto_codigo_unico_key" ON "projeto"("codigo_unico");

-- CreateIndex
CREATE INDEX "projeto_cliente_id_idx" ON "projeto"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "projeto_cliente_id_tipo_key" ON "projeto"("cliente_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_cliente_id_key" ON "onboarding"("cliente_id");

-- CreateIndex
CREATE INDEX "onboarding_step_onboarding_id_idx" ON "onboarding_step"("onboarding_id");

-- CreateIndex
CREATE INDEX "onboarding_evento_cliente_id_idx" ON "onboarding_evento"("cliente_id");

-- CreateIndex
CREATE INDEX "aula_conclusao_cliente_id_idx" ON "aula_conclusao"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "aula_conclusao_aula_id_cliente_id_key" ON "aula_conclusao"("aula_id", "cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_codigo_unico_key" ON "lead"("codigo_unico");

-- CreateIndex
CREATE INDEX "lead_status_idx" ON "lead"("status");

-- CreateIndex
CREATE INDEX "lead_responsavel_id_idx" ON "lead"("responsavel_id");

-- CreateIndex
CREATE UNIQUE INDEX "conteudo_codigo_unico_key" ON "conteudo"("codigo_unico");

-- CreateIndex
CREATE INDEX "conteudo_cliente_id_idx" ON "conteudo"("cliente_id");

-- CreateIndex
CREATE INDEX "conteudo_status_idx" ON "conteudo"("status");

-- CreateIndex
CREATE INDEX "conteudo_squad_id_idx" ON "conteudo"("squad_id");

-- CreateIndex
CREATE INDEX "avaliacao_conteudo_id_idx" ON "avaliacao"("conteudo_id");

-- CreateIndex
CREATE INDEX "avaliacao_responsavel_id_idx" ON "avaliacao"("responsavel_id");

-- CreateIndex
CREATE INDEX "rework_log_conteudo_id_idx" ON "rework_log"("conteudo_id");

-- CreateIndex
CREATE INDEX "rework_log_origem_idx" ON "rework_log"("origem");

-- CreateIndex
CREATE UNIQUE INDEX "vaga_codigo_unico_key" ON "vaga"("codigo_unico");

-- CreateIndex
CREATE INDEX "candidato_vaga_id_idx" ON "candidato"("vaga_id");

-- CreateIndex
CREATE INDEX "candidato_status_idx" ON "candidato"("status");

-- CreateIndex
CREATE UNIQUE INDEX "compra_codigo_unico_key" ON "compra"("codigo_unico");

-- CreateIndex
CREATE INDEX "compra_status_idx" ON "compra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bug_codigo_unico_key" ON "bug"("codigo_unico");

-- CreateIndex
CREATE INDEX "bug_status_idx" ON "bug"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campanha_codigo_unico_key" ON "campanha"("codigo_unico");

-- CreateIndex
CREATE INDEX "campanha_cliente_id_idx" ON "campanha"("cliente_id");

-- CreateIndex
CREATE INDEX "campanha_status_idx" ON "campanha"("status");

-- CreateIndex
CREATE INDEX "otimizacao_campanha_campanha_id_idx" ON "otimizacao_campanha"("campanha_id");

-- CreateIndex
CREATE INDEX "conversa_cliente_id_idx" ON "conversa"("cliente_id");

-- CreateIndex
CREATE INDEX "conversa_status_idx" ON "conversa"("status");

-- CreateIndex
CREATE INDEX "conversa_atendente_id_idx" ON "conversa"("atendente_id");

-- CreateIndex
CREATE INDEX "conversa_wa_telefone_idx" ON "conversa"("wa_telefone");

-- CreateIndex
CREATE UNIQUE INDEX "mensagem_wa_msg_id_key" ON "mensagem"("wa_msg_id");

-- CreateIndex
CREATE INDEX "mensagem_conversa_id_idx" ON "mensagem"("conversa_id");

-- CreateIndex
CREATE INDEX "webhook_log_criado_em_idx" ON "webhook_log"("criado_em");

-- CreateIndex
CREATE INDEX "comunicado_fixado_idx" ON "comunicado"("fixado");

-- CreateIndex
CREATE UNIQUE INDEX "canal_chat_nome_key" ON "canal_chat"("nome");

-- CreateIndex
CREATE INDEX "mensagem_chat_canal_id_criado_em_idx" ON "mensagem_chat"("canal_id", "criado_em");

-- CreateIndex
CREATE INDEX "agendamento_sala_inicio_idx" ON "agendamento_sala"("inicio");

-- CreateIndex
CREATE INDEX "home_office_data_idx" ON "home_office"("data");

-- CreateIndex
CREATE UNIQUE INDEX "home_office_usuario_id_data_key" ON "home_office"("usuario_id", "data");

-- CreateIndex
CREATE INDEX "agendamento_colaborador_colaborador_id_inicio_idx" ON "agendamento_colaborador"("colaborador_id", "inicio");

-- CreateIndex
CREATE INDEX "cliente_medalha_cliente_id_idx" ON "cliente_medalha"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_medalha_medalha_id_cliente_id_key" ON "cliente_medalha"("medalha_id", "cliente_id");

-- CreateIndex
CREATE INDEX "criterio_avaliacao_tipo_idx" ON "criterio_avaliacao"("tipo");

-- CreateIndex
CREATE INDEX "conta_pagar_pago_idx" ON "conta_pagar"("pago");

-- CreateIndex
CREATE INDEX "documento_colaborador_colaborador_id_idx" ON "documento_colaborador"("colaborador_id");

-- CreateIndex
CREATE INDEX "avaliacao_desempenho_colaborador_id_idx" ON "avaliacao_desempenho"("colaborador_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area" ADD CONSTRAINT "area_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista" ADD CONSTRAINT "lista_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_membro" ADD CONSTRAINT "squad_membro_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_membro" ADD CONSTRAINT "squad_membro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "plano"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution" ADD CONSTRAINT "job_execution_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automacao_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "plano"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatura" ADD CONSTRAINT "fatura_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatura" ADD CONSTRAINT "fatura_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_step" ADD CONSTRAINT "onboarding_step_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_evento" ADD CONSTRAINT "onboarding_evento_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aula_conclusao" ADD CONSTRAINT "aula_conclusao_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aula_conclusao" ADD CONSTRAINT "aula_conclusao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudo" ADD CONSTRAINT "conteudo_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudo" ADD CONSTRAINT "conteudo_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudo" ADD CONSTRAINT "conteudo_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao" ADD CONSTRAINT "avaliacao_conteudo_id_fkey" FOREIGN KEY ("conteudo_id") REFERENCES "conteudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao" ADD CONSTRAINT "avaliacao_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rework_log" ADD CONSTRAINT "rework_log_conteudo_id_fkey" FOREIGN KEY ("conteudo_id") REFERENCES "conteudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidato" ADD CONSTRAINT "candidato_vaga_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug" ADD CONSTRAINT "bug_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otimizacao_campanha" ADD CONSTRAINT "otimizacao_campanha_campanha_id_fkey" FOREIGN KEY ("campanha_id") REFERENCES "campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otimizacao_campanha" ADD CONSTRAINT "otimizacao_campanha_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversa" ADD CONSTRAINT "conversa_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversa" ADD CONSTRAINT "conversa_atendente_id_fkey" FOREIGN KEY ("atendente_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagem_chat" ADD CONSTRAINT "mensagem_chat_canal_id_fkey" FOREIGN KEY ("canal_id") REFERENCES "canal_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagem_chat" ADD CONSTRAINT "mensagem_chat_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_inventario" ADD CONSTRAINT "item_inventario_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ouvidoria" ADD CONSTRAINT "ouvidoria_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_sala" ADD CONSTRAINT "agendamento_sala_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_office" ADD CONSTRAINT "home_office_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_colaborador" ADD CONSTRAINT "agendamento_colaborador_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_medalha" ADD CONSTRAINT "cliente_medalha_medalha_id_fkey" FOREIGN KEY ("medalha_id") REFERENCES "medalha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_medalha" ADD CONSTRAINT "cliente_medalha_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_colaborador" ADD CONSTRAINT "documento_colaborador_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao_desempenho" ADD CONSTRAINT "avaliacao_desempenho_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao_desempenho" ADD CONSTRAINT "avaliacao_desempenho_avaliador_id_fkey" FOREIGN KEY ("avaliador_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

