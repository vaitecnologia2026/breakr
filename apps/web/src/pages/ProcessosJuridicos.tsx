// Gestão de Processos Jurídicos (Administração › Jurídico).
// Ao contrário das demais telas pendentes, este módulo NÃO tem backend/model
// existente para reaproveitar (é um domínio novo — contencioso jurídico). Para
// respeitar o bloqueio (sem criar model/migration), a tela entrega a estrutura
// pronta e honesta, sem dado fabricado: assim que o backend jurídico existir,
// basta conectá-la. Não quebra nada e não inventa informação.
import { PaginaHeader, Alerta } from '../components/ui';

const COLUNAS = ['Processo', 'Cliente / Parte', 'Vara / Comarca', 'Fase', 'Status'];

export function ProcessosJuridicos() {
  return (
    <>
      <PaginaHeader
        titulo="Gestão de Processos Jurídicos"
        subtitulo="Contencioso jurídico — acompanhamento de processos, fases e prazos"
      />

      <Alerta tipo="info">
        Estrutura da tela pronta. Este módulo é um domínio novo (contencioso) e ainda não possui
        fonte de dados no backend — nenhuma informação fictícia é exibida. Quando a API jurídica
        for criada, esta tela passa a listar os processos automaticamente.
      </Alerta>

      <div className="brk-card brk-card-p" style={{ marginTop: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {COLUNAS.map((c) => (
                <th key={c} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--texto-fraco)', borderBottom: '1px solid var(--borda)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUNAS.length} style={{ padding: '16px 10px', color: 'var(--texto-fraco)' }}>
                Nenhum processo cadastrado (aguardando conexão com o backend jurídico).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
