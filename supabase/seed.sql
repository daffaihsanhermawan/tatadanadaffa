-- ==============================================================================
-- TataDana Initial Seed Data
-- ==============================================================================

-- Seed Default Categories (available to all users)
INSERT INTO public.categories (id, user_id, name, icon, color, type, is_default)
VALUES 
    (gen_random_uuid(), NULL, 'Makanan & Minuman', '🍜', '#F97316', 'expense', TRUE),
    (gen_random_uuid(), NULL, 'Transportasi', '🚗', '#3B82F6', 'expense', TRUE),
    (gen_random_uuid(), NULL, 'Hiburan & Hobi', '🎮', '#8B5CF6', 'expense', TRUE),
    (gen_random_uuid(), NULL, 'Tagihan & Utilitas', '🏠', '#EF4444', 'expense', TRUE),
    (gen_random_uuid(), NULL, 'Kesehatan & Medis', '💊', '#10B981', 'expense', TRUE),
    (gen_random_uuid(), NULL, 'Belanja Kebutuhan', '👕', '#EC4899', 'expense', TRUE),
    (gen_random_uuid(), NULL, 'Pendidikan & Kursus', '📚', '#06B6D4', 'expense', TRUE),
    (gen_random_uuid(), NULL, 'Gaji Bulanan', '💰', '#22C55E', 'income', TRUE),
    (gen_random_uuid(), NULL, 'Freelance & Side Job', '💼', '#F59E0B', 'income', TRUE),
    (gen_random_uuid(), NULL, 'Investasi & Dividen', '📈', '#14B8A6', 'income', TRUE)
ON CONFLICT DO NOTHING;

-- Seed Default AI Providers
INSERT INTO public.ai_providers (name, display_name, api_key_encrypted, is_active, priority, mode, model_name)
VALUES 
    ('gemini', 'Google Gemini', 'ENCRYPTED_DEMO_GEMINI_KEY', TRUE, 1, 'failover', 'gemini-1.5-flash'),
    ('openai', 'OpenAI GPT', 'ENCRYPTED_DEMO_OPENAI_KEY', TRUE, 2, 'failover', 'gpt-4o-mini'),
    ('deepseek', 'DeepSeek AI', 'ENCRYPTED_DEMO_DEEPSEEK_KEY', TRUE, 3, 'failover', 'deepseek-chat')
ON CONFLICT (name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    priority = EXCLUDED.priority,
    model_name = EXCLUDED.model_name;
