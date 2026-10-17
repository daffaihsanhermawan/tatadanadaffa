import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Category } from '@/types';
import { callAIOrchestrator } from '@/lib/ai/orchestrator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'user-demo-tatadana';

  const categories = Array.from(inMemoryStore.categories.values())
    .filter(c => c.user_id === userId || c.is_default);

  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId = 'user-demo-tatadana', name, icon = '📁', color = '#FF6B00', type = 'expense', onboardingAnswers } = body;

    // AI Onboarding Recommendation
    if (action === 'ai_recommend') {
      const systemPrompt = `Kamu adalah perancang finansial TataDana. Berdasarkan jawaban onboarding pengguna mengenai profil finansialnya, rekomendasikan 6-8 kategori pengeluaran dan pemasukan yang paling relevan untuk kehidupannya.
Format balasan HANYA JSON array:
[
  { "name": "🍜 Makanan & Jajan", "icon": "🍜", "color": "#F97316", "type": "expense" },
  { "name": "🚗 Bensin & Ojol", "icon": "🚗", "color": "#3B82F6", "type": "expense" }
]`;

      const aiRes = await callAIOrchestrator({
        feature: 'category_recommendation',
        systemPrompt,
        userPrompt: `Profil pengguna: ${JSON.stringify(onboardingAnswers || 'Karyawan swasta usia 26 tahun, sering ngopi dan naik ojol')}`,
        temperature: 0.3
      });

      let cleaned = aiRes.text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();

      const recommendedList = JSON.parse(cleaned);

      return NextResponse.json({ ok: true, recommendations: recommendedList });
    }

    // Create custom category
    const catId = `cat-${Date.now()}`;
    const newCategory: Category = {
      id: catId,
      user_id: userId,
      name,
      icon,
      color,
      type: type as any,
      is_default: false,
      created_at: new Date().toISOString()
    };

    inMemoryStore.categories.set(catId, newCategory);
    return NextResponse.json({ ok: true, category: newCategory });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
