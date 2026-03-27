/**
 * PDF Export Service
 * Generate PDFs from forms and records
 */

import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Generate PDF from HTML element
 * Converts form/record to printable PDF
 */
export async function generatePDFFromElement(
  elementId: string,
  fileName: string
): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) throw new Error('Element not found');

    // Use dynamic import to handle html2pdf
    const { default: html2pdf } = await import('html2pdf.js');
    
    const options = {
      margin: 10,
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Create a simple PDF document
 */
export async function createSimplePDF(
  _title: string,
  data: Record<string, string | number>,
  fileName: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const font = await pdfDoc.embedFont('Courier');
  
  const { height } = page.getSize();
  let yPosition = height - 50;

  // Add data
  Object.entries(data).forEach(([key, value]) => {
    page.drawText(`${key}: ${value}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
  });

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export records as PDF table
 */
export async function exportRecordsAsPDF(
  records: any[],
  columns: string[],
  fileName: string,
  title: string
): Promise<void> {
  try {
    // Create HTML table
    const html = `
      <div style="font-family: Calibri, Arial, sans-serif; padding: 20px;">
        <h2 style="text-align: center; color: #030A8C;">${title}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #A7C7E7;">
              ${columns.map(col => `<th style="border: 1px solid #ccc; padding: 8px; text-align: left;">${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${records.map(record => `
              <tr>
                ${columns.map(col => `<td style="border: 1px solid #ccc; padding: 8px;">${record[col] || '-'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          Generated on: ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    const html2pdf = (await import('html2pdf.js')).default;
    const options = {
      margin: 10,
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' },
    };

    const element = document.createElement('div');
    element.innerHTML = html;
    await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error('Error exporting records as PDF:', error);
    throw error;
  }
}

/**
 * Export as CSV (simpler alternative to PDF for data)
 */
export function exportAsCSV(
  records: any[],
  columns: string[],
  fileName: string
): void {
  try {
    // Create CSV header
    const csvContent = [
      columns.join(','),
      ...records.map(record =>
        columns.map(col => {
          const value = record[col] || '';
          // Escape quotes in CSV
          return typeof value === 'string' && value.includes(',')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      ),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}
