// Geracao do relatorio de resultados do cliente em PDF (Briefing Marketing —
// Secao 12, item 12: exportacao de relatorios em PDF para o cliente). Usa pdfkit,
// mesmo padrao do ContratoPdfService — zero dependencia externa de terceiros.
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface DadosRelatorioPdf {
  clienteNome: string;
  geradoEm: Date;
  totalCampanhas: number;
  ativos: number;
  impressoes: number;
  cliques: number;
  ctr: number;
  investimento: number;
  conversoes: number;
  custoPorResultado: number | null;
  anuncios: { nome: string; objetivo: string | null; status: string }[];
}

@Injectable()
export class PortalRelatorioPdfService {
  gerar(dados: DadosRelatorioPdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const moeda = (v: number) =>
        v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const numero = (v: number) => v.toLocaleString('pt-BR');

      // Cabecalho
      doc.fontSize(20).font('Helvetica-Bold').text('Relatório de resultados', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica').fillColor('#555')
        .text(dados.clienteNome)
        .text(`Gerado em ${dados.geradoEm.toLocaleString('pt-BR')}`);
      doc.moveDown(1);
      doc.fillColor('#000');

      // Indicadores
      const linhas: [string, string][] = [
        ['Campanhas', `${numero(dados.totalCampanhas)} (${numero(dados.ativos)} ativa(s))`],
        ['Impressões', numero(dados.impressoes)],
        ['Cliques', numero(dados.cliques)],
        ['CTR', `${dados.ctr}%`],
        ['Investimento', moeda(dados.investimento)],
        ['Conversões', numero(dados.conversoes)],
        ['Custo por resultado', dados.custoPorResultado === null ? '—' : moeda(dados.custoPorResultado)],
      ];
      doc.fontSize(13).font('Helvetica-Bold').text('Indicadores');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      for (const [rotulo, valor] of linhas) {
        doc.font('Helvetica-Bold').text(`${rotulo}: `, { continued: true });
        doc.font('Helvetica').text(valor);
      }
      doc.moveDown(1);

      // Anuncios ativos
      doc.fontSize(13).font('Helvetica-Bold').text('Anúncios ativos');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      if (dados.anuncios.length === 0) {
        doc.fillColor('#777').text('Nenhum anúncio ativo no momento.').fillColor('#000');
      } else {
        for (const a of dados.anuncios) {
          doc.font('Helvetica-Bold').text(`• ${a.nome}`, { continued: true });
          doc.font('Helvetica').text(a.objetivo ? ` — ${a.objetivo}` : '');
        }
      }

      doc.moveDown(2);
      doc.fontSize(9).fillColor('#999')
        .text('Relatório gerado automaticamente pelo Breakr OS.', { align: 'center' });

      doc.end();
    });
  }
}
