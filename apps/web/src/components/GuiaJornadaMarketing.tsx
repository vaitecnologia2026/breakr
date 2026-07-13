// Guia da jornada de Marketing — explicador (somente leitura) de COMO o trabalho
// de marketing acontece, na ordem certa, e de COMO operar cada etapa no sistema.
// É um painel recolhível, aditivo, exibido no topo das telas do menu Marketing.
// Não altera nenhuma lógica nem chama API: apenas orienta quem está usando.
//
// A prop `etapaAtual` (opcional) destaca a etapa referente à tela em que o guia
// está sendo exibido (badge "Você está aqui"), sem afetar as demais.
import { useState } from 'react';

// Uma etapa da jornada: o que acontece, quem conduz, em qual tela e como operar.
interface EtapaJornada {
  id: string;
  titulo: string;
  quem: string;
  resumo: string;
  onde: string;
  como: string;
}

// As 7 etapas, na ordem em que o trabalho de marketing percorre o sistema.
// Baseadas no Briefing de Marketing (Seções 2–9) já implementado no Breakr.
const ETAPAS: EtapaJornada[] = [
  {
    id: 'onboarding',
    titulo: '1. Onboarding & Squad',
    quem: 'CS / Coordenadora',
    resumo: 'O cliente entra, é vinculado a um squad e tem os pilares contratados (Marketing, Gestão, Financeiro) marcados.',
    onde: 'Dashboard de Marketing (bloco “Clientes em onboarding”) e Squads.',
    como: 'No bloco de onboarding, use “Vincular squad”. Confira a capacidade do time antes de distribuir o trabalho.',
  },
  {
    id: 'planejamento',
    titulo: '2. Planejamento da campanha',
    quem: 'Coordenadora / CS',
    resumo: 'Cria-se a campanha (avulsa ou por template) e geram-se os materiais/tarefas, atribuídos por função do squad.',
    onde: 'Campanhas.',
    como: '“+ Nova campanha”: defina objetivo, prazo e materiais. Use templates para gerar tarefas em lote para vários clientes.',
  },
  {
    id: 'aprovacao-interna',
    titulo: '3. Aprovação interna',
    quem: 'Gestão / Financeiro',
    resumo: 'Só para clientes com mais de um pilar: a campanha passa por aval interdepartamental antes de ir para produção.',
    onde: 'Aprovações internas.',
    como: 'O departamento responsável decide: Aprovar, Sugerir ajuste ou Reprovar (com comentário). Clientes só de Marketing pulam esta etapa.',
  },
  {
    id: 'producao',
    titulo: '4. Produção (Copy → Design → Revisão)',
    quem: 'Copywriter, Designer, Revisão',
    resumo: 'Cada material/peça percorre o funil de produção até ficar pronto para o cliente.',
    onde: 'Campanhas (materiais) e Conteúdo (funil das peças).',
    como: 'Arraste o card entre as colunas ou use “Mover”. Use “Encaminhar p/ design”, clique no card para ver/editar os detalhes e anexar a mídia.',
  },
  {
    id: 'aprovacao-cliente',
    titulo: '5. Aprovação do cliente',
    quem: 'Cliente (portal)',
    resumo: 'O cliente vê a prévia e decide: Aprovar, Aprovar com ressalvas ou Reprovar (comentário obrigatório ao reprovar).',
    onde: 'Conteúdo (coluna “Aprovação do cliente”) + Portal do cliente.',
    como: 'Ao mover a peça para “Aprovação do cliente”, o CS é avisado. O feedback do cliente volta vinculado à peça.',
  },
  {
    id: 'publicacao',
    titulo: '6. Publicação & destino final',
    quem: 'Gestor de tráfego / CS',
    resumo: 'Peça aprovada segue ao destino: tráfego pago vai ao laboratório de criativos; orgânico é agendado e publicado; impressão vai à gráfica.',
    onde: 'Conteúdo (Agendado / Laboratório / Publicado) e Tráfego.',
    como: 'Mova a peça para Agendado e depois Publicado. Peças marcadas “para tráfego” seguem ao laboratório de criativos.',
  },
  {
    id: 'acompanhamento',
    titulo: '7. Acompanhamento & métricas',
    quem: 'Coordenadora',
    resumo: 'Acompanha entrega no prazo, retrabalho, capacidade do time e evolução — e age sobre as urgências.',
    onde: 'Dashboard de Marketing (alertas) e Métricas de Marketing.',
    como: 'Filtre por squad, cliente e período. Trate os alertas (parados, prazos críticos, aprovações pendentes) direto do dashboard.',
  },
];

export function GuiaJornadaMarketing({ etapaAtual }: { etapaAtual?: string }) {
  // Recolhido por padrão: não atrapalha quem já conhece o fluxo; expande sob demanda.
  const [aberto, setAberto] = useState(false);
  return (
    <section className="brk-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left', color: 'var(--texto)',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16 }}>🧭</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
          Como funciona a jornada de Marketing
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
          {aberto ? 'ocultar' : 'passo a passo'}
        </span>
        <span
          aria-hidden="true"
          style={{ transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', color: 'var(--texto-fraco)' }}
        >
          ▸
        </span>
      </button>

      {aberto && (
        <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12.5, color: 'var(--texto-suave)', margin: 0 }}>
            Da entrada do cliente à publicação e ao acompanhamento — a ordem em que o trabalho acontece e onde operar cada etapa no sistema.
          </p>
          {ETAPAS.map((e) => {
            const atual = e.id === etapaAtual;
            return (
              <div
                key={e.id}
                style={{
                  border: `1px solid ${atual ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`,
                  background: atual ? 'var(--superficie-2)' : 'transparent',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>{e.titulo}</span>
                  <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>· {e.quem}</span>
                  {atual && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--amarelo-fagulha)', border: '1px solid var(--amarelo-fagulha)', borderRadius: 999, padding: '1px 8px' }}>
                      Você está aqui
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--texto-suave)', margin: '6px 0 0' }}>{e.resumo}</p>
                <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '4px 0 0' }}>
                  <b style={{ color: 'var(--texto-suave)' }}>Onde:</b> {e.onde}
                </p>
                <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '2px 0 0' }}>
                  <b style={{ color: 'var(--texto-suave)' }}>Como operar:</b> {e.como}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
