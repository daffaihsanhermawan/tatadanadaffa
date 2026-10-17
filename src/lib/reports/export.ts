import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction, ReportExport } from '@/types';
import { formatRupiah, formatWIBDateTime, formatWIBDateShort } from '@/lib/utils/timezone';
import { inMemoryStore } from '@/lib/supabase/db-service';

export interface GenerateReportParams {
  userId: string;
  transactions: Transaction[];
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  format: 'pdf' | 'xlsx';
}

/**
 * Generate PDF Report with professional fintech orange branding
 */
export async function generatePdfReport(params: GenerateReportParams): Promise<{
  blob: Blob;
  fileName: string;
  summary: { totalIncome: number; totalExpense: number; netCashflow: number };
}> {
  const { transactions, periodLabel, userId } = params;
  const doc = new jsPDF();

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const netCashflow = totalIncome - totalExpense;

  // Header Background Accent (TataDana Orange #FF6B00)
  doc.setFillColor(255, 107, 0);
  doc.rect(0, 0, 210, 24, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TataDana — Laporan Keuangan Pribadi', 14, 15);

  // Subtitle / Period
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${periodLabel}`, 14, 34);
  doc.text(`Waktu Generate: ${formatWIBDateTime()}`, 14, 40);

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 24, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 46, 182, 24, 3, 3, 'S');

  // Metric 1: Pemasukan
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PEMASUKAN', 20, 53);
  doc.setFontSize(12);
  doc.setTextColor(22, 163, 74);
  doc.setFont('helvetica', 'bold');
  doc.text(formatRupiah(totalIncome), 20, 62);

  // Metric 2: Pengeluaran
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL PENGELUARAN', 80, 53);
  doc.setFontSize(12);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(formatRupiah(totalExpense), 80, 62);

  // Metric 3: Net Cashflow
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('NET CASHFLOW', 140, 53);
  doc.setFontSize(12);
  doc.setTextColor(netCashflow >= 0 ? 37 : 220, netCashflow >= 0 ? 99 : 38, netCashflow >= 0 ? 235 : 38);
  doc.setFont('helvetica', 'bold');
  doc.text(formatRupiah(netCashflow), 140, 62);

  // Transactions Table
  const tableRows = transactions.map((t, index) => [
    index + 1,
    formatWIBDateShort(t.transaction_date),
    t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Transfer',
    t.category_name || (t.type === 'transfer' ? 'Transfer' : 'Lainnya'),
    t.wallet_name || 'Dompet Utama',
    t.notes || '-',
    (t.type === 'income' ? '+ ' : '- ') + formatRupiah(t.amount)
  ]);

  (doc as any).autoTable({
    startY: 76,
    head: [['No', 'Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Catatan', 'Nominal']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 107, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22 },
      3: { cellWidth: 32 },
      4: { cellWidth: 26 },
      5: { cellWidth: 40 },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 6) {
        const text = data.cell.raw as string;
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [22, 163, 74];
        } else {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    }
  });

  const fileName = `TataDana_Laporan_${periodLabel.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const blob = doc.output('blob');

  return {
    blob,
    fileName,
    summary: { totalIncome, totalExpense, netCashflow }
  };
}

/**
 * Generate Excel (.xlsx) Report with multi-sheet summary and clean cell formatting
 */
export async function generateExcelReport(params: GenerateReportParams): Promise<{
  buffer: ArrayBuffer;
  fileName: string;
  summary: { totalIncome: number; totalExpense: number; netCashflow: number };
}> {
  const { transactions, periodLabel } = params;

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const netCashflow = totalIncome - totalExpense;

  // Sheet 1: Transaksi
  const txRows = transactions.map((t, idx) => ({
    'No': idx + 1,
    'Tanggal (WIB)': formatWIBDateTime(t.transaction_date),
    'Tipe': t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Transfer',
    'Kategori': t.category_name || '-',
    'Dompet': t.wallet_name || '-',
    'Nominal': Number(t.amount),
    'Catatan': t.notes || '',
    'Merchant': t.merchant_name || '',
    'Sumber': t.source
  }));

  // Sheet 2: Ringkasan
  const summaryRows = [
    { 'Metrik': 'Periode Laporan', 'Nilai': periodLabel },
    { 'Metrik': 'Waktu Dibuat (WIB)', 'Nilai': formatWIBDateTime() },
    { 'Metrik': 'Jumlah Transaksi', 'Nilai': transactions.length },
    { 'Metrik': 'Total Pemasukan (IDR)', 'Nilai': totalIncome },
    { 'Metrik': 'Total Pengeluaran (IDR)', 'Nilai': totalExpense },
    { 'Metrik': 'Net Cashflow (IDR)', 'Nilai': netCashflow },
  ];

  const workbook = XLSX.utils.book_new();
  const txSheet = XLSX.utils.json_to_sheet(txRows);
  const sumSheet = XLSX.utils.json_to_sheet(summaryRows);

  XLSX.utils.book_append_sheet(workbook, txSheet, 'Transaksi');
  XLSX.utils.book_append_sheet(workbook, sumSheet, 'Ringkasan');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const fileName = `TataDana_Laporan_${periodLabel.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;

  return {
    buffer: excelBuffer,
    fileName,
    summary: { totalIncome, totalExpense, netCashflow }
  };
}

/**
 * Record an export event in the database history
 */
export async function recordExportHistory(
  userId: string,
  fileName: string,
  fileType: 'pdf' | 'xlsx',
  periodRange: string,
  summary: { totalIncome: number; totalExpense: number; netCashflow: number }
): Promise<ReportExport> {
  const exportItem: ReportExport = {
    id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    user_id: userId,
    file_name: fileName,
    file_type: fileType,
    file_path: `exports/${userId}/${fileName}`,
    signed_url: `/api/reports/download?file=${fileName}`,
    signed_url_expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days expiry
    period_range: periodRange,
    total_income: summary.totalIncome,
    total_expense: summary.totalExpense,
    net_cashflow: summary.netCashflow,
    created_at: new Date().toISOString(),
  };

  inMemoryStore.reportExports.unshift(exportItem);
  return exportItem;
}
