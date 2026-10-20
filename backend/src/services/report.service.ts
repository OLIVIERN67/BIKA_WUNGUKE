import PDFDocument from 'pdfkit';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { ApiError } from '../utils/api-error';
import { TransactionWithCategory } from './transaction.service';
import { CategoryBreakdown } from './dashboard.service';

/**
 * Safety ceiling on report exports. Prevents an unbounded date range from
 * exhausting API memory while still covering every realistic trader.
 */
const MAX_REPORT_ROWS = 10_000;

export interface ReportRange {
  from?: string;
  to?: string;
  type?: 'income' | 'expense';
}

export interface ReportMeta {
  traderName: string;
  businessName?: string | null;
  businessType?: string | null;
  businessLocation?: string | null;
  businessDescription?: string | null;
  currency: string;
  from?: string;
  to?: string;
  savings?: { deposits: number; withdrawals: number; balance: number };
  incomeByCategory?: CategoryBreakdown[];
  expenseByCategory?: CategoryBreakdown[];
}

interface Totals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export async function fetchTransactions(
  userId: number,
  range: ReportRange,
): Promise<TransactionWithCategory[]> {
  const where = ['t.user_id = ?'];
  const params: unknown[] = [userId];
  if (range.from) {
    where.push('t.txn_date >= ?');
    params.push(range.from);
  }
  if (range.to) {
    where.push('t.txn_date <= ?');
    params.push(range.to);
  }
  if (range.type) {
    where.push('t.type = ?');
    params.push(range.type);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY t.txn_date ASC, t.id ASC
      LIMIT ?`,
    [...params, MAX_REPORT_ROWS + 1],
  );
  if (rows.length > MAX_REPORT_ROWS) {
    throw ApiError.badRequest(
      'The selected date range contains too many records to export at once. ' +
        'Please narrow the range and try again.',
    );
  }
  return rows as TransactionWithCategory[];
}

export function computeTotals(rows: TransactionWithCategory[]): Totals {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === 'income') income += Number(row.amount);
    else expense += Number(row.amount);
  }
  return { income, expense, net: income - expense, count: rows.length };
}

export function toCsv(rows: TransactionWithCategory[]): string {
  const header = [
    'Date',
    'Type',
    'Category',
    'Description',
    'Payment method',
    'Amount',
  ];

  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        String(row.txn_date).slice(0, 10),
        row.type,
        row.category_name ?? 'Uncategorised',
        row.description ?? '',
        row.payment_method,
        Number(row.amount).toFixed(2),
      ]
        .map(escape)
        .join(','),
    );
  }

  const totals = computeTotals(rows);
  lines.push('');
  lines.push(`Total income,,, ,,${totals.income.toFixed(2)}`);
  lines.push(`Total expense,,, ,,${totals.expense.toFixed(2)}`);
  lines.push(`Net cash flow,,, ,,${totals.net.toFixed(2)}`);

  return lines.join('\n');
}

export function streamPdf(
  res: NodeJS.WritableStream,
  rows: TransactionWithCategory[],
  meta: ReportMeta,
): void {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const totals = computeTotals(rows);
  const fmt = (n: number) => `${meta.currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  doc.fontSize(20).fillColor('#065f46').text('BIKA WUNGUKE', { align: 'left' });
  doc
    .fontSize(10)
    .fillColor('#334155')
    .text('Bika neza. Cunga neza. Wunguke kurushaho.')
    .moveDown(0.5);

  doc.fontSize(14).fillColor('#0f172a').text('Financial Record Report');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#334155');
  doc.text(`Trader: ${meta.traderName}`);
  if (meta.businessName) doc.text(`Business: ${meta.businessName}`);
  if (meta.businessType) doc.text(`Business category: ${meta.businessType}`);
  if (meta.businessLocation) doc.text(`Location: ${meta.businessLocation}`);
  if (meta.businessDescription) doc.text(`About: ${meta.businessDescription}`);
  doc.text(`Currency: ${meta.currency}`);
  doc.text(`Period: ${meta.from ?? 'All time'} to ${meta.to ?? 'today'}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(0.8);

  doc.fontSize(12).fillColor('#065f46').text('Summary');
  doc.fontSize(10).fillColor('#0f172a');
  doc.text(`Total recorded income: ${fmt(totals.income)}`);
  doc.text(`Total recorded expenses: ${fmt(totals.expense)}`);
  doc.fillColor(totals.net >= 0 ? '#16a34a' : '#dc2626');
  doc.text(`Net cash flow (income - expenses): ${fmt(totals.net)}`);
  doc.fillColor('#0f172a').text(`Transactions recorded: ${totals.count}`);
  doc.moveDown(0.4);

  if (meta.savings) {
    doc.fontSize(12).fillColor('#065f46').text('Savings summary');
    doc.fontSize(10).fillColor('#0f172a');
    doc.text(`Total savings deposits: ${fmt(meta.savings.deposits)}`);
    doc.text(`Total savings withdrawals: ${fmt(meta.savings.withdrawals)}`);
    doc.text(`Savings balance: ${fmt(meta.savings.balance)}`);
    doc
      .fontSize(8)
      .fillColor('#64748b')
      .text(
        'Savings are recorded separately and are not counted as business income or expenses.',
      );
    doc.moveDown(0.4);
  }

  const drawCategoryTable = (title: string, items: CategoryBreakdown[]) => {
    if (!items || items.length === 0) return;
    doc.fontSize(12).fillColor('#065f46').text(title);
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor('#0f172a');
    for (const item of items) {
      doc.text(
        `${item.category_name}  -  ${item.count} record(s)  -  ${fmt(item.total)}`,
        { width: 500 },
      );
    }
    doc.moveDown(0.4);
  };

  drawCategoryTable('Recorded income by category', meta.incomeByCategory ?? []);
  drawCategoryTable('Recorded expenses by category', meta.expenseByCategory ?? []);

  doc.fontSize(12).fillColor('#065f46').text('Transaction history');
  doc.moveDown(0.2);

  const columns: Array<{ label: string; width: number; align?: 'left' | 'right' }> = [
    { label: 'Date', width: 70 },
    { label: 'Type', width: 55 },
    { label: 'Category', width: 110 },
    { label: 'Description', width: 170 },
    { label: 'Amount', width: 110, align: 'right' },
  ];

  const startX = doc.x;
  let y = doc.y;

  const drawHeader = () => {
    doc.fontSize(9).fillColor('#065f46');
    let x = startX;
    for (const col of columns) {
      doc.text(col.label, x, y, { width: col.width, align: col.align ?? 'left' });
      x += col.width;
    }
    y += 16;
    doc
      .moveTo(startX, y - 3)
      .lineTo(startX + columns.reduce((s, c) => s + c.width, 0), y - 3)
      .strokeColor('#cbd5e1')
      .stroke();
  };

  drawHeader();

  doc.fontSize(9).fillColor('#334155');
  for (const row of rows) {
    if (y > 720) {
      doc.addPage();
      y = doc.y;
      drawHeader();
      doc.fillColor('#334155');
    }
    const cells = [
      String(row.txn_date).slice(0, 10),
      row.type,
      row.category_name ?? 'Uncategorised',
      (row.description ?? '').slice(0, 40),
      fmt(Number(row.amount)),
    ];
    let x = startX;
    cells.forEach((cell, i) => {
      doc.text(cell, x, y, { width: columns[i].width, align: columns[i].align ?? 'left' });
      x += columns[i].width;
    });
    y += 16;
  }

  doc.moveDown(2);
  doc
    .fontSize(9)
    .fillColor('#b45309')
    .text('Important notice', { underline: false });
  doc
    .fontSize(8)
    .fillColor('#64748b')
    .text(
      'This report summarises information entered by the trader themselves in BIKA WUNGUKE. ' +
        'It is NOT an official financial statement, a verified income certificate, a credit score, ' +
        'or a guarantee of loan approval. It has not been verified with a bank, SACCO, or any other ' +
        'institution. Please review it before sharing it with anyone.',
      { width: 500 },
    );
  doc.moveDown(0.5);
  doc
    .fontSize(8)
    .fillColor('#94a3b8')
    .text('Generated by BIKA WUNGUKE - a simple cash-flow tool for small traders in Rwanda.');

  doc.end();
}
