/**
 * PDF Generator for Report Cards
 * Uses browser's print functionality and html2canvas for PDF generation
 */

export interface PDFOptions {
  filename?: string;
  format?: 'A4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * Generate PDF from HTML element using print functionality
 */
export async function generatePDFFromElement(
  elementId: string,
  options: PDFOptions = {}
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const {
    filename = 'report-card.pdf',
    format = 'A4',
    orientation = 'portrait',
  } = options;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }

  // Clone the element and its styles
  const clonedElement = element.cloneNode(true) as HTMLElement;
  
  // Get all stylesheets
  const stylesheets = Array.from(document.styleSheets);
  let styles = '';
  
  stylesheets.forEach((stylesheet) => {
    try {
      const rules = Array.from(stylesheet.cssRules || []);
      rules.forEach((rule) => {
        styles += rule.cssText + '\n';
      });
    } catch (e) {
      // Cross-origin stylesheets may throw errors
    }
  });

  // Get inline styles from the element
  const inlineStyles = window.getComputedStyle(element);
  let inlineStyleString = '';
  for (let i = 0; i < inlineStyles.length; i++) {
    const property = inlineStyles[i];
    inlineStyleString += `${property}: ${inlineStyles.getPropertyValue(property)}; `;
  }

  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${filename}</title>
        <style>
          ${styles}
          @page {
            size: ${format} ${orientation};
            margin: ${options.margin?.top || 10}mm ${options.margin?.right || 10}mm ${options.margin?.bottom || 10}mm ${options.margin?.left || 10}mm;
          }
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div style="${inlineStyleString}">
          ${clonedElement.innerHTML}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Download HTML content as PDF using browser print
 */
export async function downloadAsPDF(
  htmlContent: string,
  options: PDFOptions = {}
): Promise<void> {
  const {
    filename = 'report-card.pdf',
  } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Generate PDF using html2canvas and jsPDF (if available)
 * Falls back to print method if libraries not available
 */
export async function generatePDFAdvanced(
  elementId: string,
  options: PDFOptions = {}
): Promise<void> {
  try {
    // Try to use html2canvas and jsPDF if available
    const html2canvas = (window as any).html2canvas;
    const jsPDF = (window as any).jspdf?.jsPDF;

    if (html2canvas && jsPDF) {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: options.format || 'a4',
      });

      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(options.filename || 'report-card.pdf');
      return;
    }
  } catch (error) {
    console.warn('Advanced PDF generation failed, falling back to print method:', error);
  }

  // Fallback to print method
  return generatePDFFromElement(elementId, options);
}

