// Başvuru listesinin CSV, Excel ve PDF çıktıları. Ağır kütüphaneler yalnızca dışa aktarırken yüklenir.

export interface ExportTable {
  /** Dosya adının gövdesi, ör. basvurular-tech-2026-10-29 */
  fileName: string
  /** PDF başlığı, ör. "tech — Üyelik başvurusu" */
  title: string
  /** PDF başlığın altındaki bilgi satırı (tarih, kayıt sayısı, filtreler). */
  subtitle: string
  header: string[]
  body: string[][]
}

function download(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

// `=`, `+`, `-`, `@` ile başlayan hücreler tablo programında formül olarak çalışmasın diye başına `'` eklenir.
const neutralize = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value)

/** Excel'in Türkçe karakterleri doğru açması için UTF-8 BOM ve `;` ayırıcı kullanılır. */
export function exportCsv(table: ExportTable) {
  const cell = (value: string) => {
    const safe = neutralize(value)
    return /[";\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
  }
  const content = '﻿' + [table.header, ...table.body].map((row) => row.map(cell).join(';')).join('\r\n')
  download(`${table.fileName}.csv`, new Blob([content], { type: 'text/csv;charset=utf-8' }))
}

export async function exportXlsx(table: ExportTable) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const data = [
    table.header.map((value) => ({ value, fontWeight: 'bold' as const, wrap: true })),
    ...table.body.map((row) => row.map((value) => ({ value: neutralize(value), wrap: true, alignVertical: 'top' as const }))),
  ]
  const columns = table.header.map((title) => ({ width: Math.min(Math.max(title.length, 14), 40) }))
  const blob = await writeExcelFile(data, { columns, sheet: 'Başvurular', stickyRowsCount: 1 }).toBlob()
  download(`${table.fileName}.xlsx`, blob)
}

async function fontBase64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export async function exportPdf(table: ExportTable) {
  const [{ jsPDF }, { autoTable }, regular, bold] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    fontBase64('/fonts/LiberationSerif-Regular.ttf'),
    fontBase64('/fonts/LiberationSerif-Bold.ttf'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.addFileToVFS('LiberationSerif-Regular.ttf', regular)
  doc.addFont('LiberationSerif-Regular.ttf', 'Serif', 'normal')
  doc.addFileToVFS('LiberationSerif-Bold.ttf', bold)
  doc.addFont('LiberationSerif-Bold.ttf', 'Serif', 'bold')

  doc.setFont('Serif', 'bold')
  doc.setFontSize(14)
  doc.text(table.title, 14, 16)
  doc.setFont('Serif', 'normal')
  doc.setFontSize(10)
  doc.text(table.subtitle, 14, 22)

  // Sütun sayısı arttıkça yazı küçülür ki tablo sayfa genişliğine sığsın.
  const columns = table.header.length
  const fontSize = columns <= 8 ? 9 : columns <= 14 ? 7 : columns <= 20 ? 6 : 5

  autoTable(doc, {
    head: [table.header],
    body: table.body,
    startY: 27,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      font: 'Serif',
      fontSize,
      cellPadding: 1,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.1,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: { font: 'Serif', fontStyle: 'bold', fillColor: 255, textColor: 0 },
    columnStyles: { 0: { cellWidth: 7 } },
  })

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont('Serif', 'normal')
    doc.setFontSize(9)
    const { width, height } = doc.internal.pageSize
    doc.text(`${page} / ${pages}`, width - 14, height - 8, { align: 'right' })
  }

  download(`${table.fileName}.pdf`, doc.output('blob'))
}
