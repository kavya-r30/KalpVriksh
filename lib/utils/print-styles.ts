// Shared print styles for certificates and documents
export const CERTIFICATE_PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 20px;
    font-family: 'Times New Roman', serif;
    background: white;
  }
  .bg-white { background-color: white; }
  .text-black { color: black; }
  .text-center { text-align: center; }
  .text-justify { text-justify: inter-word; text-align: justify; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .font-semibold { font-weight: 600; }
  .font-serif { font-family: 'Times New Roman', serif; }
  .uppercase { text-transform: uppercase; }
  .underline { text-decoration: underline; }
  .border { border: 1px solid #ccc; }
  .border-2 { border: 2px solid #ccc; }
  .border-4 { border: 4px solid #ccc; }
  .border-double { border-style: double; }
  .border-green-800 { border-color: #166534; }
  .border-green-600 { border-color: #16a34a; }
  .border-green-300 { border-color: #86efac; }
  .border-green-200 { border-color: #bbf7d0; }
  .border-blue-800 { border-color: #1e40af; }
  .border-blue-600 { border-color: #2563eb; }
  .border-amber-600 { border-color: #d97706; }
  .border-gray-400 { border-color: #9ca3af; }
  .border-gray-300 { border-color: #d1d5db; }
  .border-t { border-top: 1px solid #ccc; }
  .border-b { border-bottom: 1px solid #ccc; }
  .border-b-2 { border-bottom: 2px solid #ccc; }
  .rounded { border-radius: 4px; }
  .rounded-lg { border-radius: 8px; }
  .rounded-full { border-radius: 9999px; }
  .p-2 { padding: 8px; }
  .p-4 { padding: 16px; }
  .p-6 { padding: 24px; }
  .p-8 { padding: 32px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .px-8 { padding-left: 32px; padding-right: 32px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .py-4 { padding-top: 16px; padding-bottom: 16px; }
  .pt-2 { padding-top: 8px; }
  .pt-4 { padding-top: 16px; }
  .pt-6 { padding-top: 24px; }
  .pb-4 { padding-bottom: 16px; }
  .pb-6 { padding-bottom: 24px; }
  .mt-1 { margin-top: 4px; }
  .mt-2 { margin-top: 8px; }
  .mt-3 { margin-top: 12px; }
  .mt-4 { margin-top: 16px; }
  .mt-6 { margin-top: 24px; }
  .mt-8 { margin-top: 32px; }
  .mt-16 { margin-top: 64px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-3 { margin-bottom: 12px; }
  .mb-4 { margin-bottom: 16px; }
  .mb-6 { margin-bottom: 24px; }
  .mb-8 { margin-bottom: 32px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .w-full { width: 100%; }
  .w-24 { width: 96px; }
  .w-1\\/3 { width: 33.333%; }
  .h-16 { height: 64px; }
  .h-24 { height: 96px; }
  .min-h-\\[800px\\] { min-height: 800px; }
  .leading-8 { line-height: 2rem; }
  .leading-relaxed { line-height: 1.625; }
  .tracking-wider { letter-spacing: 0.05em; }
  .tracking-widest { letter-spacing: 0.1em; }
  .text-xs { font-size: 12px; }
  .text-sm { font-size: 14px; }
  .text-lg { font-size: 18px; }
  .text-xl { font-size: 20px; }
  .text-2xl { font-size: 24px; }
  .text-3xl { font-size: 30px; }
  .text-\\[120px\\] { font-size: 120px; }
  .text-green-800 { color: #166534; }
  .text-green-700 { color: #15803d; }
  .text-green-600 { color: #16a34a; }
  .text-blue-800 { color: #1e40af; }
  .text-blue-700 { color: #1d4ed8; }
  .text-amber-700 { color: #b45309; }
  .text-gray-600 { color: #4b5563; }
  .text-gray-500 { color: #6b7280; }
  .text-gray-700 { color: #374151; }
  .bg-green-50 { background-color: #f0fdf4; }
  .bg-blue-50 { background-color: #eff6ff; }
  .bg-amber-50 { background-color: #fffbeb; }
  .flex { display: flex; }
  .inline-block { display: inline-block; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .gap-2 { gap: 8px; }
  .gap-4 { gap: 16px; }
  .gap-8 { gap: 32px; }
  .items-center { align-items: center; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .space-y-2 > * + * { margin-top: 8px; }
  .space-y-4 > * + * { margin-top: 16px; }
  .relative { position: relative; }
  .absolute { position: absolute; }
  .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
  .z-10 { z-index: 10; }
  .opacity-5 { opacity: 0.05; }
  .pointer-events-none { pointer-events: none; }
  .rotate-\\[-30deg\\] { transform: rotate(-30deg); }
  .decoration-double { text-decoration-style: double; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 4px 8px; }
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .bg-green-50 { background-color: #f0fdf4 !important; }
    .bg-blue-50 { background-color: #eff6ff !important; }
    .bg-amber-50 { background-color: #fffbeb !important; }
    .border-green-800 { border-color: #166534 !important; }
    .border-blue-800 { border-color: #1e40af !important; }
    .text-green-800 { color: #166534 !important; }
    .text-blue-800 { color: #1e40af !important; }
  }
  @page { margin: 0.5in; size: A4; }
`

export function printDocument(contentHtml: string, title: string = "Document"): void {
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>${CERTIFICATE_PRINT_STYLES}</style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  }
}
