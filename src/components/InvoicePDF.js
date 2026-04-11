import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateInvoicePDF(bill, company = {}) {
  const doc = new jsPDF()
  const { customer, items, invoice_number, created_at } = bill
  const date = new Date(created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const companyName = company.company_name || 'My Company'
  const companyAddress = [company.address, company.city, company.state, company.postal_code]
    .filter(Boolean).join(', ')
  const companyContact = [company.mobile, company.email].filter(Boolean).join('  |  ')
  const companyGST = company.gst_no || ''
  const companyWebsite = company.website || ''

  // ── Header area ───────────────────────────────────────────
  const headerH = 56

  // Company name and details on the right side
  const headerRightX = 196
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, headerRightX, 16, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let headerY = 24
  if (companyAddress) {
    const addressLines = doc.splitTextToSize(companyAddress, 82)
    doc.text(addressLines, headerRightX, headerY, { align: 'right' })
    headerY += addressLines.length * 5
  }
  if (companyContact) {
    const contactLines = doc.splitTextToSize(companyContact, 82)
    doc.text(contactLines, headerRightX, headerY, { align: 'right' })
    headerY += contactLines.length * 5
  }
  if (companyGST) {
    const gstLine = `GSTIN: ${companyGST}`
    doc.text(gstLine, headerRightX, headerY, { align: 'right' })
    headerY += 7
  }
  if (companyWebsite) {
    const websiteLines = doc.splitTextToSize(companyWebsite, 82)
    doc.text(websiteLines, headerRightX, headerY, { align: 'right' })
    headerY += websiteLines.length * 5
  }

  doc.setDrawColor(55, 65, 81)
  doc.setLineWidth(0.6)
  doc.line(14, headerH - 4, 196, headerH - 4)

  // ── Divider line ───────────────────────────────────────────
  doc.setTextColor(26, 26, 46)
  const afterHeader = headerH + 10

  // ── Bill To section ────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('BILL TO', 14, afterHeader)

  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(customer.customer_name, 14, afterHeader + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let y = afterHeader + 14
  if (customer.address) {
    const lines = doc.splitTextToSize(customer.address, 90)
    doc.text(lines, 14, y); y += lines.length * 5
  }
  if (customer.postal_code) { doc.text(`PIN: ${customer.postal_code}`, 14, y); y += 5 }
  doc.text(`Mobile: ${customer.mobile}`, 14, y); y += 5
  if (customer.gst_no) { doc.text(`GSTIN: ${customer.gst_no}`, 14, y); y += 5 }
  doc.text(`Customer ID: ${customer.customer_id}`, 14, y)

  const invoiceBoxX = 118
  const invoiceBoxY = afterHeader
  const invoiceBoxWidth = 72
  const invoiceBoxHeight = 28
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, invoiceBoxHeight, 3, 3, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('Invoice No', invoiceBoxX + 4, invoiceBoxY + 7)
  doc.text('Date', invoiceBoxX + 4, invoiceBoxY + 17)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(26, 26, 46)
  doc.text(invoice_number, invoiceBoxX + invoiceBoxWidth - 4, invoiceBoxY + 7, { align: 'right' })
  doc.text(date, invoiceBoxX + invoiceBoxWidth - 4, invoiceBoxY + 17, { align: 'right' })

  doc.setDrawColor(226, 232, 240)
  doc.line(invoiceBoxX, invoiceBoxY + 11, invoiceBoxX + invoiceBoxWidth, invoiceBoxY + 11)

  // ── Items table ────────────────────────────────────────────
  const tableStartY = Math.max(y + 10, afterHeader + 45)
  const wrapCellText = (value, width, maxLines = 2) => {
    const lines = doc.splitTextToSize(String(value || ''), width)
    if (lines.length <= maxLines) return lines.join('\n')
    return `${lines.slice(0, maxLines).join('\n')}…`
  }

  const tableBody = items.map((bi, idx) => [
    idx + 1,
    wrapCellText(bi.item.item_name, 32),
    bi.item.item_code,
    wrapCellText(bi.item.description || '—', 40),
    bi.quantity,
    `Rs ${bi.unit_price.toFixed(2)}`,
    `Rs ${bi.total_price.toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Item Name', 'Code', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableBody,
    styles: { fontSize: 9, overflow: 'linebreak', cellPadding: 3, valign: 'middle' },
    headStyles: { fillColor: [236, 72, 153], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { textColor: [26, 26, 46] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 35, overflow: 'linebreak' },
      2: { cellWidth: 18 },
      3: { cellWidth: 45, textColor: [100, 116, 139], overflow: 'linebreak' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    tableWidth: 182,
    tableLineWidth: 0.25,
    tableLineColor: [226, 232, 240],
  })

  // ── GST Summary box ────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 8
  const summaryX = 112

  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  const summaryWidth = 84
  doc.roundedRect(summaryX, finalY, summaryWidth, 52, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Subtotal', summaryX + 4, finalY + 10)
  doc.text(`CGST (${bill.cgst_rate}%)`, summaryX + 4, finalY + 20)
  doc.text(`SGST (${bill.sgst_rate}%)`, summaryX + 4, finalY + 30)

  doc.setTextColor(26, 26, 46)
  const summaryValueX = summaryX + summaryWidth - 6
  doc.text(`Rs ${bill.subtotal.toFixed(2)}`, summaryValueX, finalY + 10, { align: 'right' })
  doc.text(`Rs ${bill.cgst_amount.toFixed(2)}`, summaryValueX, finalY + 20, { align: 'right' })
  doc.text(`Rs ${bill.sgst_amount.toFixed(2)}`, summaryValueX, finalY + 30, { align: 'right' })

  // Total row
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(summaryX, finalY + 36, summaryWidth, 16, 2, 2, 'S')
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL', summaryX + 4, finalY + 47)
  doc.text(`Rs ${bill.total_amount.toFixed(2)}`, summaryValueX, finalY + 47, { align: 'right' })

  // ── Notes ──────────────────────────────────────────────────
  const notesX = 14
  const notesWidth = summaryX - notesX - 4
  let bankY = finalY + 60
  if (bill.notes) {
    const notesY = finalY + 4
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Notes:', notesX, notesY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(26, 26, 46)
    const noteLines = doc.splitTextToSize(bill.notes, notesWidth)
    doc.text(noteLines, notesX, notesY + 8)
    const notesBottom = notesY + 8 + noteLines.length * 5
    bankY = Math.max(finalY + 52 + 8, notesBottom + 8)
  }

  // ── Bank Details ───────────────────────────────────────────
  if (company.bank_name || company.bank_account) {
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, bankY, 100, 28, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('BANK DETAILS', 18, bankY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(26, 26, 46)
    doc.setFontSize(8)
    if (company.bank_name) { doc.text(`Bank: ${company.bank_name}`, 18, bankY + 15) }
    if (company.bank_account) { doc.text(`A/C: ${company.bank_account}`, 18, bankY + 21) }
    if (company.bank_ifsc) { doc.text(`IFSC: ${company.bank_ifsc}`, 70, bankY + 21) }
  }

  // ── Footer ─────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Thanking You', 196, pageH - 10, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(companyName, 196, pageH - 4, { align: 'right' })

  doc.save(`${invoice_number}.pdf`)
}
