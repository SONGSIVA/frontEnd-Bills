import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Page constants ─────────────────────────────────────────────
const PAGE_W      = 210
const PAGE_H      = 297
const MARGIN      = 14
const RIGHT_EDGE  = PAGE_W - MARGIN   // 196
const CONTENT_W   = PAGE_W - MARGIN * 2
const FOOTER_H    = 20                // enough room for 2-line footer
const SAFE_BOTTOM = PAGE_H - FOOTER_H - 4

// ── Info line style — all sub-header text uses this ───────────
const INFO_SIZE   = 8.5
const INFO_COLOR  = [128, 0, 64]      // company details color
const INFO_GAP    = 5.2               // mm between each info line

// ── Draw footer — no background, right-aligned, 2 lines ───────
function drawFooter(doc, companyName, companyWebsite) {
  const lineY1 = PAGE_H - 12   // "Thanking You"
  const lineY2 = PAGE_H - 6    // company name

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 80)
  doc.text('Thanking You,', RIGHT_EDGE, lineY1, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(companyName, RIGHT_EDGE, lineY2, { align: 'right' })

  // Thin separator line below footer
  doc.setDrawColor(210, 214, 230)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, PAGE_H - 2, RIGHT_EDGE, PAGE_H - 2)
}

async function fetchImageBase64(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch logo: ${response.status}`)
  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  const base64 = window.btoa(binary)
  const contentType = blob.type || 'image/png'
  const format = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG'
  return { base64, format }
}

// ── Ensure enough space — push to new page if needed ──────────
function ensureSpace(doc, curY, needed, companyName, companyWebsite) {
  if (curY + needed > SAFE_BOTTOM) {
    doc.addPage()
    return MARGIN + 6
  }
  return curY
}

// ── Main PDF generator ────────────────────────────────────────
export async function generateInvoicePDF(bill, company = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { customer, items, invoice_number, created_at } = bill

  const date = new Date(created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const companyName    = company.company_name || 'My Company'
  const companyAddr    = [company.address, company.city, company.state, company.postal_code]
                           .filter(Boolean).join(', ')
  const companyContact = [company.mobile, company.email].filter(Boolean).join('  |  ')
  const companyGST     = company.gst_no  || ''
  const companyWebsite = company.website || ''

  const logoUrl = company.logo_url || ''
  let logoBase64 = ''
  let logoFmt = 'PNG'
  if (logoUrl) {
    try {
      const resolvedUrl = logoUrl.startsWith('http') ? logoUrl : `http://127.0.0.1:8080${logoUrl.startsWith('/') ? logoUrl : '/' + logoUrl}`
      const imageData = await fetchImageBase64(resolvedUrl)
      logoBase64 = imageData.base64
      logoFmt = imageData.format
    } catch (e) {
      console.warn('Logo fetch failed:', e)
    }
  }

  // ── HEADER — no background colour ────────────────────────────
  // Count info lines to size the header block dynamically
  const infoLineCount = [companyAddr, companyContact, companyGST, companyWebsite]
                          .filter(Boolean).length
  // Company name row + info lines + invoice row + padding
  const HEADER_H = 8 + 7 + (infoLineCount * INFO_GAP) + 7 + 4

  // Thin bottom border under header instead of filled background
  doc.setDrawColor(210, 214, 230)
  doc.setLineWidth(0.4)
  doc.line(0, HEADER_H, PAGE_W, HEADER_H)

  // ── Logo — top-left, fixed ────────────────────────────────────
  const LOGO_SIZE = HEADER_H - 6
  const LOGO_X    = MARGIN - 2
  const LOGO_Y    = 3

  if (logoBase64) {
    try {
      doc.addImage(
        logoBase64, logoFmt,
        LOGO_X + 2, LOGO_Y + 2,
        LOGO_SIZE - 4, LOGO_SIZE - 4,
        '', 'FAST'
      )
    } catch (e) {
      console.warn('Logo render failed:', e)
    }
  }

  // ── Company info — top-right, right-aligned ───────────────────
  // Company name — bold, larger
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(128, 0, 64)
  doc.text(companyName, RIGHT_EDGE, LOGO_Y + 6, { align: 'right' })

  // Company address and contact — same font, same size, same colour
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(INFO_SIZE)
  doc.setTextColor(...INFO_COLOR)

  let infoY = LOGO_Y + 6 + INFO_GAP + 0.5
  if (companyAddr) {
    // Wrap long addresses to max 90mm wide
    const addrLines = doc.splitTextToSize(companyAddr, 90)
    addrLines.forEach(l => {
      doc.text(l, RIGHT_EDGE, infoY, { align: 'right' })
      infoY += INFO_GAP
    })
  }
  if (companyContact) { doc.text(companyContact,          RIGHT_EDGE, infoY, { align: 'right' }); infoY += INFO_GAP }
  if (companyGST)     { doc.text(`GSTIN: ${companyGST}`, RIGHT_EDGE, infoY, { align: 'right' }); infoY += INFO_GAP }
  if (companyWebsite) { doc.text(companyWebsite,          RIGHT_EDGE, infoY, { align: 'right' }); infoY += INFO_GAP }

  // Invoice metadata line — same style, right-aligned, at bottom of header
  const metaY = HEADER_H - 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(INFO_SIZE)
  doc.setTextColor(...INFO_COLOR)
  doc.text(
    `Invoice No: ${invoice_number}   |   Date: ${date}   |   TAX INVOICE`,
    RIGHT_EDGE, metaY, { align: 'right' }
  )

  // ── BODY ──────────────────────────────────────────────────────
  let curY = HEADER_H + 8

  // ── BILL TO ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('BILL TO', MARGIN, curY)
  curY += 4

  // Pre-compute customer card fields
  const custAddrLines = customer.address
    ? doc.splitTextToSize(customer.address, 82)
    : []

  const custFields = [
    { text: customer.customer_name, bold: true,  size: 10  },
    ...custAddrLines.map(l => ({ text: l, bold: false, size: INFO_SIZE })),
    customer.postal_code
      ? { text: `PIN: ${customer.postal_code}`,        bold: false, size: INFO_SIZE }
      : null,
    { text: `Mobile: ${customer.mobile}`,               bold: false, size: INFO_SIZE },
    customer.gst_no
      ? { text: `GSTIN: ${customer.gst_no}`,           bold: false, size: INFO_SIZE }
      : null,
    { text: `Customer ID: ${customer.customer_id}`,    bold: false, size: INFO_SIZE },
  ].filter(Boolean)

  const CARD_PADDING  = 5
  const CARD_LINE_H   = INFO_GAP
  const CUST_CARD_H   = CARD_PADDING + custFields.length * CARD_LINE_H + CARD_PADDING

  // Card background
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(MARGIN, curY, CONTENT_W / 2, CUST_CARD_H, 3, 3, 'FD')

  let custY = curY + CARD_PADDING + 1
  custFields.forEach(field => {
    doc.setFont('helvetica', field.bold ? 'bold' : 'normal')
    doc.setFontSize(field.size)
    // Name and details get black colour
    doc.setTextColor(0, 0, 0)
    doc.text(field.text, MARGIN + 4, custY)
    custY += CARD_LINE_H
  })

  curY += CUST_CARD_H + 8

  // ── ITEMS TABLE ───────────────────────────────────────────────
  curY = ensureSpace(doc, curY, 30, companyName, companyWebsite)

  const tableBody = items.map((bi, idx) => [
    idx + 1,
    bi.item.item_name,
    bi.quantity,
    bi.unit_price.toFixed(2),
    bi.total_price.toFixed(2),
  ])

  autoTable(doc, {
  startY: curY,
  head: [['#', 'Item Name', 'Qty', 'Unit Price', 'Amount']],
  body: tableBody,
  headStyles: {
    fillColor: [128, 0, 64], 
    textColor: 255,
    fontStyle: 'bold', 
    fontSize: 8.5, 
    cellPadding: 3,
    halign: 'center', // default for all headers
  },
  bodyStyles: {
    fontSize: 8.5,
    textColor: [0, 0, 0],
    cellPadding: 2.5,
  },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  columnStyles: {
    0: { cellWidth: 10,  halign: 'center' },  
    1: { cellWidth: 94,  halign: 'left' },    
    2: { cellWidth: 18,  halign: 'center' },  
    3: { cellWidth: 30,  halign: 'right' },   
    4: { cellWidth: 30,  halign: 'right' },   
  },
  didParseCell: (data) => {
    if (data.section === 'head') {
      if (data.column.index === 1) data.cell.styles.halign = 'left'
      if (data.column.index === 3 || data.column.index === 4) {
        data.cell.styles.halign = 'right'
      }
    }
  },
  margin: { left: 14, right: 14, top: 0, bottom: 0 },
  repeatHeader: false,
})

  curY = doc.lastAutoTable.finalY + 8

  // ── GST SUMMARY + NOTES + BANK ────────────────────────────────
  const SUMMARY_H = 52
  const noteLines = bill.notes ? doc.splitTextToSize(bill.notes, 82) : []
  const NOTES_H   = bill.notes ? noteLines.length * INFO_GAP + 16 : 0
  const BANK_H    = (company.bank_name || company.bank_account) ? 34 : 0
  const BLOCK_H   = Math.max(SUMMARY_H, NOTES_H) + BANK_H + 8

  curY = ensureSpace(doc, curY, BLOCK_H, companyName, companyWebsite)

  const summaryX  = PAGE_W / 2 + 6
  const summaryW  = RIGHT_EDGE - summaryX
  const labelX    = summaryX + 4
  const valueX    = RIGHT_EDGE - 2

  // Summary card background
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(summaryX, curY, summaryW, SUMMARY_H, 3, 3, 'FD')

  // Summary rows
  const roundOffValue = Math.round(bill.total_amount) - bill.total_amount
  const summaryRows = [
    { label: 'Subtotal',                  value: bill.subtotal.toFixed(2)     },
    { label: `CGST (${bill.cgst_rate}%)`, value: bill.cgst_amount.toFixed(2) },
    { label: `SGST (${bill.sgst_rate}%)`, value: bill.sgst_amount.toFixed(2) },
  ]
  let rowY = curY + 9
  summaryRows.forEach(r => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(INFO_SIZE)
    doc.setTextColor(100, 116, 139)
    doc.text(r.label, labelX, rowY)
    doc.setTextColor(...INFO_COLOR)
    doc.text(r.value, valueX, rowY, { align: 'right' })
    rowY += 8.5
  })

  // Round-off row
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(INFO_SIZE)
  doc.setTextColor(100, 116, 139)
  doc.text('Round Off', labelX, rowY)
  doc.setTextColor(...INFO_COLOR)
  doc.text(roundOffValue.toFixed(2), valueX, rowY, { align: 'right' })
  rowY += 8.5

  // Divider
  doc.setDrawColor(210, 214, 230)
  doc.setLineWidth(0.3)
  doc.line(summaryX + 3, rowY - 1, RIGHT_EDGE - 3, rowY - 1)

  // Total row — no filled bar, just bold text with accent colour
  const totalY = rowY + 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(128, 0, 64)
  doc.text('TOTAL', labelX, totalY)
  doc.text(Math.round(bill.total_amount).toFixed(2), valueX, totalY, { align: 'right' })

  // ── Notes (left column, aligned with summary) ─────────────────
  if (bill.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text('NOTES', MARGIN, curY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(INFO_SIZE)
    doc.setTextColor(...INFO_COLOR)
    noteLines.forEach((line, i) => {
      doc.text(line, MARGIN, curY + 15 + i * INFO_GAP)
    })
  }

  curY = totalY + 12

  // ── Bank details (left) and Thank you message (right) on same line ──
  if (company.bank_name || company.bank_account) {
    curY = ensureSpace(doc, curY, BANK_H, companyName, companyWebsite)
    
    // Bank details card - left side
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(MARGIN, curY, CONTENT_W / 2, BANK_H - 4, 3, 3, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text('BANK DETAILS', MARGIN + 4, curY + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(INFO_SIZE)
    doc.setTextColor(...INFO_COLOR)
    let bY = curY + 14
    if (company.bank_name)    { doc.text(`Bank: ${company.bank_name}`,       MARGIN + 4, bY); bY += INFO_GAP }
    if (company.bank_account) { doc.text(`A/C No: ${company.bank_account}`,  MARGIN + 4, bY); bY += INFO_GAP }
    if (company.bank_ifsc)    { doc.text(`IFSC: ${company.bank_ifsc}`,       MARGIN + 4, bY) }
    
    // Thank you message - right side, aligned with bank details
    const thankYouY = curY + 12 + (INFO_GAP * 2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(128, 0, 64)
    doc.text('Thanking you', RIGHT_EDGE, thankYouY, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(128, 0, 64)
    doc.text(companyName, RIGHT_EDGE, thankYouY + 6, { align: 'right' })
    
    curY += BANK_H + 4
  } else {
    // If no bank details, show thank you message only
    let thankYouY = curY + 10 + (INFO_GAP * 2)
    
    // Check if message fits on current page, if not add new page
    if (thankYouY + 12 > PAGE_H - 10) {
      doc.addPage()
      thankYouY = MARGIN + 20
    }
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(128, 0, 64)
    doc.text('Thanking you', RIGHT_EDGE, thankYouY, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(128, 0, 64)
    doc.text(companyName, RIGHT_EDGE, thankYouY + 6, { align: 'right' })
  }

  doc.save(`${invoice_number}.pdf`)
}
