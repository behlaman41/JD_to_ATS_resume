const PdfPrinter = require('pdfmake');
const fs = require('fs');

// Simple plain-text PDF generator that preserves line breaks and indentation
// Uses the same base font/margins as pdf-resume-generator for visual consistency
class PlaintextPDFGenerator {
  constructor() {
    this.fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    this.printer = new PdfPrinter(this.fonts);
  }

  async generateFromText(text, outputPath, headerTitle = 'Resume') {
    const content = text.split('\n').map((line) => ({ text: line.replace(/\t/g, '    '), style: 'mono' }));

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Helvetica', fontSize: 10, lineHeight: 1.2 },
      content: [
        { text: headerTitle, style: 'header', margin: [0, 0, 0, 10], alignment: 'center' },
        { text: '\n' },
        ...content
      ],
      styles: {
        header: { fontSize: 14, bold: true },
        mono: { fontSize: 10 }
      }
    };

    await new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const stream = fs.createWriteStream(outputPath);
        stream.on('finish', resolve);
        stream.on('error', reject);
        pdfDoc.pipe(stream);
        pdfDoc.end();
      } catch (err) {
        reject(err);
      }
    });

    return outputPath;
  }
}

module.exports = PlaintextPDFGenerator;

