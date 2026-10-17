import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { generatePdfReport, generateExcelReport } from '@/lib/reports/export';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const record = inMemoryStore.reportExports.find(r => r.id === id);
    if (!record) {
      return NextResponse.json({ ok: false, message: 'File laporan tidak ditemukan atau sudah kadaluarsa.' }, { status: 404 });
    }

    const userTx = Array.from(inMemoryStore.transactions.values()).filter(t => t.user_id === record.user_id);

    if (record.file_type === 'pdf') {
      const { blob } = await generatePdfReport({
        userId: record.user_id,
        transactions: userTx,
        periodLabel: record.period_range,
        format: 'pdf'
      });
      const buffer = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${record.file_name}"`
        }
      });
    } else {
      const { buffer } = await generateExcelReport({
        userId: record.user_id,
        transactions: userTx,
        periodLabel: record.period_range,
        format: 'xlsx'
      });
      return new NextResponse(Buffer.from(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${record.file_name}"`
        }
      });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
