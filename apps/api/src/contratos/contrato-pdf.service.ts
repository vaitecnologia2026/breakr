// Geração nativa de contrato em PDF usando pdfkit.
// Substitui Google Docs — zero dependência de terceiros para o documento.
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface DadosContratoPdf {
  codigoUnico: string;
  clienteNome: string;
  clienteCnpj?: string | null;
  planoNome?: string | null;
  valorMensal: number;
  dataInicio?: Date | null;
  vencimento?: Date | null;
  // Signatário do cliente (nome + e-mail)
  signatarioNome?: string | null;
  signatarioEmail?: string | null;
}

@Injectable()
export class ContratoPdfService {
  /** Gera o PDF do contrato e retorna como Buffer. */
  gerar(dados: DadosContratoPdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 60 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { codigoUnico, clienteNome, clienteCnpj, planoNome, valorMensal, dataInicio, vencimento } = dados;

      const dataFormatada = (d?: Date | null) =>
        d ? d.toLocaleDateString('pt-BR') : '—';
      const moeda = (v: number) =>
        v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      // ── Cabeçalho ──────────────────────────────────────────────────────
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#0a0a0a')
        .text('BREAKR', { align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#555555')
        .text('Agência de Marketing Digital', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .moveTo(60, doc.y)
        .lineTo(535, doc.y)
        .strokeColor('#dddddd')
        .lineWidth(1)
        .stroke();
      doc.moveDown(1);

      // ── Título ────────────────────────────────────────────────────────
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#0a0a0a')
        .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', { align: 'center' });

      doc.moveDown(0.4);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#888888')
        .text(`Código: ${codigoUnico}`, { align: 'center' });

      doc.moveDown(1.5);

      // ── Partes ────────────────────────────────────────────────────────
      secao(doc, 'CONTRATANTE');
      campo(doc, 'Razão Social / Nome', clienteNome);
      if (clienteCnpj) campo(doc, 'CNPJ / CPF', clienteCnpj);
      doc.moveDown(0.8);

      secao(doc, 'CONTRATADA');
      campo(doc, 'Razão Social', 'Breakr Agência de Marketing Digital Ltda.');
      doc.moveDown(0.8);

      // ── Objeto ────────────────────────────────────────────────────────
      secao(doc, 'OBJETO DO CONTRATO');
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text(
          `A CONTRATADA prestará serviços de marketing digital${planoNome ? ` no plano ${planoNome}` : ''} ` +
          `à CONTRATANTE, conforme escopo acordado e briefing aprovado pelas partes.`,
          { lineGap: 4 },
        );
      doc.moveDown(0.8);

      // ── Vigência ─────────────────────────────────────────────────────
      secao(doc, 'VIGÊNCIA E VALOR');
      campo(doc, 'Início', dataFormatada(dataInicio));
      campo(doc, 'Vencimento', dataFormatada(vencimento));
      campo(doc, 'Valor mensal', moeda(valorMensal));
      doc.moveDown(0.8);

      // ── Pagamento ─────────────────────────────────────────────────────
      secao(doc, 'FORMA DE PAGAMENTO');
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text(
          'O pagamento será realizado mensalmente, até o dia 10 de cada mês, ' +
          'via boleto bancário ou PIX, conforme fatura emitida pela CONTRATADA.',
          { lineGap: 4 },
        );
      doc.moveDown(0.8);

      // ── Rescisão ──────────────────────────────────────────────────────
      secao(doc, 'RESCISÃO');
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text(
          'Este contrato poderá ser rescindido por qualquer das partes mediante notificação ' +
          'prévia de 30 (trinta) dias. O cancelamento antecipado sem aviso prévio implicará ' +
          'multa equivalente a 1 (uma) mensalidade.',
          { lineGap: 4 },
        );
      doc.moveDown(2);

      // ── Assinaturas ───────────────────────────────────────────────────
      const y = doc.y;
      // Coluna esquerda (cliente)
      doc
        .moveTo(60, y + 30)
        .lineTo(240, y + 30)
        .strokeColor('#aaaaaa')
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text('CONTRATANTE', 60, y + 35);
      doc.text(clienteNome.toUpperCase(), 60, y + 47, { width: 200 });

      // Coluna direita (Breakr)
      doc
        .moveTo(295, y + 30)
        .lineTo(475, y + 30)
        .strokeColor('#aaaaaa')
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text('CONTRATADA', 295, y + 35);
      doc.text('BREAKR AGÊNCIA DE MARKETING DIGITAL LTDA.', 295, y + 47, { width: 200 });

      // ── Rodapé ────────────────────────────────────────────────────────
      doc
        .fontSize(8)
        .fillColor('#bbbbbb')
        .text(
          `Documento gerado pelo Breakr OS em ${new Date().toLocaleDateString('pt-BR')}  •  ${codigoUnico}`,
          60,
          doc.page.height - 40,
          { align: 'center', width: 475 },
        );

      doc.end();
    });
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function secao(doc: PDFKit.PDFDocument, titulo: string): void {
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0a0a0a')
    .text(titulo.toUpperCase());
  doc
    .moveTo(60, doc.y + 2)
    .lineTo(535, doc.y + 2)
    .strokeColor('#eeeeee')
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.5);
}

function campo(doc: PDFKit.PDFDocument, label: string, valor: string): void {
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#666666')
    .text(`${label}:  `, { continued: true })
    .font('Helvetica')
    .fillColor('#111111')
    .text(valor);
}
