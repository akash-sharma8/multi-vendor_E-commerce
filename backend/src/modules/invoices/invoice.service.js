import PDFDocument from 'pdfkit';
import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';

const rs = (paise) => `Rs. ${(paise / 100).toFixed(2)}`;

// Loads data first, so any error goes to errorHandler before we start streaming a PDF.
export async function loadOrder(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: userId },
    include: {
      customer: { select: { name: true, email: true } },
      coupon: { select: { code: true } },
      items: {
        include: {
          product: { select: { title: true } },
          vendor: { select: { storeName: true } },
        },
      },
    },
  });
  if (!order) throw new AppError('Order not found', 404);
  if (order.paymentStatus !== 'PAID') {
    throw new AppError('Invoice is available only after payment', 409);
  }
  return order;
}

export function writeInvoice(order, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  doc.fontSize(20).text('Marketplace', 50, 50);
  doc.fontSize(10).fillColor('#555').text('Invoice', 50, 75);
  doc
    .fillColor('#000')
    .fontSize(10)
    .text(`Invoice no: INV-${String(order.id).padStart(5, '0')}`, 350, 50, { align: 'right', width: 195 })
    .text(`Date: ${order.createdAt.toLocaleDateString('en-IN')}`, 350, 65, { align: 'right', width: 195 })
    .text(`Order id: ${order.id}`, 350, 80, { align: 'right', width: 195 });

  doc.fontSize(11).text('Billed to', 50, 120);
  doc
    .fontSize(10)
    .fillColor('#333')
    .text(order.customer.name, 50, 137)
    .text(order.customer.email, 50, 151)
    .text(order.address, 50, 165, { width: 250 });

  // table header
  let y = 220;
  const header = () => {
    doc.fillColor('#000').fontSize(10);
    doc.text('Item', 50, y);
    doc.text('Sold by', 250, y);
    doc.text('Qty', 370, y, { width: 30, align: 'right' });
    doc.text('Price', 410, y, { width: 60, align: 'right' });
    doc.text('Total', 480, y, { width: 65, align: 'right' });
    doc.moveTo(50, y + 15).lineTo(545, y + 15).stroke();
    y += 25;
  };
  header();

  for (const item of order.items) {
    if (y > 700) {
      doc.addPage();
      y = 50;
      header();
    }
    doc.fillColor('#222').fontSize(10);
    doc.text(item.product.title, 50, y, { width: 190, height: 14, ellipsis: true });
    doc.text(item.vendor.storeName, 250, y, { width: 110, height: 14, ellipsis: true });
    doc.text(String(item.quantity), 370, y, { width: 30, align: 'right' });
    doc.text(rs(item.unitPricePaise), 410, y, { width: 60, align: 'right' });
    doc.text(rs(item.unitPricePaise * item.quantity), 480, y, { width: 65, align: 'right' });
    y += 22;
  }

  // totals
  y += 10;
  doc.moveTo(300, y).lineTo(545, y).stroke();
  y += 10;
  const line = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000').fontSize(10);
    doc.text(label, 300, y, { width: 120 });
    doc.text(value, 420, y, { width: 125, align: 'right' });
    y += 18;
  };
  line('Subtotal', rs(order.subtotalPaise));
  if (order.discountPaise > 0) {
    line(`Discount (${order.coupon?.code ?? 'coupon'})`, `- ${rs(order.discountPaise)}`);
  }
  line('Total paid', rs(order.totalPaise), true);

  doc.font('Helvetica').fontSize(9).fillColor('#777')
    .text('This is a computer generated invoice.', 50, 760, { align: 'center', width: 495 });

  doc.end();
}