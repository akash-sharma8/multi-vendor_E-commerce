import AppError from '../../utils/AppError.js';
import * as invoiceService from './invoice.service.js';

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid id', 400);
  return id;
}

export async function download(req, res) {
  const order = await invoiceService.loadOrder(req.user.id, parseId(req.params.id));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${order.id}.pdf"`);
  invoiceService.writeInvoice(order, res);
}