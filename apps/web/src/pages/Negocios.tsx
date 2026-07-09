// Tela "Negócios" (CRM Comercial) — pipeline em Kanban por etapa, ligado ao
// backend real de Leads (/comercial/leads). Os cards podem ser arrastados entre
// as colunas; ao soltar, o status do lead é persistido via PATCH. Estados de
// carregando/erro/vazio no padrão das demais telas. Em modo demo, usa mock.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro, PainelVazio, MensagemErro } from '../components/primitivos';
import { Badge } from '../components/ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  status: StatusLead;
  valorEstimado: string | null;
  atualizadoEm: string;
  responsavel?: { nome: string } | null;
  cliente?: { nomeFantasia: string } | null;
}

const COLUNAS: { status: StatusLead; titulo: string }[] = [
  { status: 'NOVO', titulo: 'Novo' },
  { status: 'CONTATADO', titulo: 'Contatado' },
  { status: 'QUALIFICADO', titulo: 'Qualificado' },
  { status: 'PROPOSTA', titulo: 'Proposta' },
  { status: 'GANHO', titulo: 'Ganho' },
  { status: 'PERDIDO', titulo: 'Perdido' },
];

const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Guria Doceira', empresa: 'Guria Doceira Ltda', email: null, telefone: null, origem: 'Inbound', status: 'NOVO', valorEstimado: null, atualizadoEm: '2026-07-03T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', nome: 'Pizzayou', empresa: 'Pizzayou Ltda', email: null, telefone: null, origem: 'Scraping', status: 'CONTATADO', valorEstimado: null, atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm3', nome: 'Fornalha Pizzaria', empresa: null, email: null, telefone: null, origem: null, status: 'QUALIFICADO', valorEstimado: '4150', atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm4', nome: 'Bolonhê', empresa: 'Bolonhê Lasanhas', email: null, telefone: null, origem: null, status: 'PROPOSTA', valorEstimado: '8000', atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
];

function formatValor(v: string | null): string {
  const n = v ? Number(v) : 0;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function Negocios() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const arrastando = useRef<string | null>(null);
  const [alvo, setAlvo] = useState<StatusLead | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
    } catch {
      setLeads(mockSeDemo(MOCK_LEADS));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoSoltar(destino: StatusLead) {
    const id = arrastando.current;
    arrastando.current = null;
    setAlvo(null);
    if (!id) return;
    const atual = leads.find((l) => l.id === id);
    if (!atual || atual.status === destino) return;
    setErroAcao(null);
    // Atualização otimista; recarrega do servidor (que pode converter em cliente no GANHO).
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: destino } : l)));
    try {
      await api.patch(`/comercial/leads/${id}/status`, { status: destino });
      await carregar();
    } catch {
      setErroAcao('Não foi possível mover o negócio. Tente novamente.');
      await carregar();
    }
  }

  const total = leads.length;

  return (
    <PaginaShell titulo="Negócios" subtitulo="Pipeline Kanban — arraste os cards entre as etapas">
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : total === 0 ? (
        <PainelVazio titulo="Nenhum negócio ainda" descricao="Os leads do comercial aparecem aqui no funil." />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{total} negócios</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {COLUNAS.map((col) => {
              const doStatus = leads.filter((l) => l.status === col.status);
              const soma = doStatus.reduce((acc, l) => acc + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0);
              return (
                <div
                  key={col.status}
                  onDragOver={(e) => { e.preventDefault(); if (alvo !== col.status) setAlvo(col.status); }}
                  onDragLeave={(e) => { if (e.currentTarget === e.target) setAlvo((a) => (a === col.status ? null : a)); }}
                  onDrop={() => aoSoltar(col.status)}
                  style={{
                    flex: '0 0 240px', background: 'var(--superficie-2)', borderRadius: 12, padding: 10,
                    border: `1px solid ${alvo === col.status ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`,
                    transition: 'border-color 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 12.5 }}>
                    <span>{col.titulo}</span>
                    <span style={{ background: 'var(--superficie-4)', borderRadius: 999, fontSize: 10.5, padding: '1px 7px', color: 'var(--texto-suave)' }}>{doStatus.length}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginBottom: 8 }}>{formatValor(String(soma))}</div>
                  {doStatus.map((l) => {
                    const dias = diasDesde(l.atualizadoEm);
                    return (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) => { arrastando.current = l.id; e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => { arrastando.current = null; setAlvo(null); }}
                        style={{ background: 'var(--superficie-3)', border: '1px solid var(--borda)', borderRadius: 10, padding: 10, marginBottom: 8, cursor: 'grab' }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{l.nome}</div>
                        {(l.empresa || l.responsavel?.nome) && (
                          <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginBottom: 6 }}>
                            {[l.empresa, l.responsavel?.nome].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                          <b>{formatValor(l.valorEstimado)}</b>
                          {l.status !== 'GANHO' && l.status !== 'PERDIDO' && (
                            <Badge cor={dias >= 5 ? 'vermelho' : 'amarelo'}>{dias}d parado</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </PaginaShell>
  );
}
