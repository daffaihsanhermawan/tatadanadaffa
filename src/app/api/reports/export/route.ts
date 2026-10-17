import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { generatePdfReport, generateExcelReport, recordExportHistory } from '@/lib/reports/export';
import { canAccessReportExport } from '@/lib/plans/limits';

/**
 * Generate Report API (PDF / Excel)
 * POST /api/reports/export
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, format = 'pdf', period = 'Semua Waktu', startDate, endDate } = body;

    const profile = inMemoryStore.profiles.get(userId || 'user-demo-tatadana');
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    // Pro plan enforcement for export
    if (!canAccessReportExport(profile)) {
      return NextResponse.json({
        ok: false,
        restricted: true,
        message: 'Fitur ekspor laporan PDF dan Excel hanya tersedia untuk pengguna TataDana Pro. Silakan upgrade paket.'
      }, { status: 403 });
    }

    // Fetch user transactions
    let userTx = Array.from(inMemoryStore.transactions.values()).filter(t => t.user_id === profile.id);

    // Apply date range filters if provided
    if (startDate) {
      userTx = userTx.filter(t => new Date(t.transaction_date) >= new Date(startDate));
    }
    if (endDate) {
      userTx = userTx.filter(t => new Date(t.transaction_date) <= new Date(endDate));
    }

    const exportParams = {
      userId: profile.id,
      transactions: userTx,
      periodLabel: period,
      startDate,
      endDate,
      format: format as 'pdf' | 'xlsx'
    };

    let fileName = '';
    let summaryData = { totalIncome: 0, totalExpense: 0, netCashflow: 0 };

    if (format === 'pdf') {
      const pdfRes = await generatePdfReport(exportParams);
      fileName = pdfRes.fileName;
      summaryData = pdfRes.summary;
    } else {
      const xlsxRes = await generateExcelReport(exportParams);
      fileName = xlsxRes.fileName;
      summaryData = xlsxRes.summary;
    }

    // Save record to database history
    const record = await recordExportHistory(
      profile.id,
      fileName,
      format as 'pdf' | 'xlsx',
      period,
      summaryData
    );

    return NextResponse.json({
      ok: true,
      exportRecord: record,
      downloadUrl: `/api/reports/download?id=${record.id}`,
      fileName,
      summary: summaryData
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Gagal generate laporan' }, { status: 500 });
  }
}
