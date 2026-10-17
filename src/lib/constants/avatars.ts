// src/lib/constants/avatars.ts

export interface AvatarPreset {
  id: string;
  name: string;
  category: 'men' | 'women' | 'cartoon' | 'mascot';
  url: string;
}

export const AVATAR_CATEGORIES = [
  { key: 'men', label: '👔 Pria Profesional' },
  { key: 'women', label: '👩‍💼 Wanita Profesional' },
  { key: 'cartoon', label: '🎨 Modern 3D / Kartun' },
  { key: 'mascot', label: '🦊 Maskot TataDana' },
] as const;

export const AVATAR_PRESETS: AvatarPreset[] = [
  // 1. Pria Profesional
  {
    id: 'men-1',
    name: 'Eksekutif Muda',
    category: 'men',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&auto=format&fit=crop&q=80',
  },
  {
    id: 'men-2',
    name: 'Tech Specialist',
    category: 'men',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&auto=format&fit=crop&q=80',
  },
  {
    id: 'men-3',
    name: 'Konsultan Finansial',
    category: 'men',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&auto=format&fit=crop&q=80',
  },

  // 2. Wanita Profesional
  {
    id: 'women-1',
    name: 'Wealth Advisor',
    category: 'women',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80',
  },
  {
    id: 'women-2',
    name: 'Perencana Finansial',
    category: 'women',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&auto=format&fit=crop&q=80',
  },
  {
    id: 'women-3',
    name: 'Product Manager',
    category: 'women',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&auto=format&fit=crop&q=80',
  },

  // 3. Modern 3D / Kartun
  {
    id: 'cartoon-1',
    name: '3D Casual Explorer',
    category: 'cartoon',
    url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=TataDanaExplorer&backgroundColor=fed7aa',
  },
  {
    id: 'cartoon-2',
    name: '3D Analyst Cool',
    category: 'cartoon',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FinTechPro&backgroundColor=ffedd5',
  },
  {
    id: 'cartoon-3',
    name: '3D Minimalist Tech',
    category: 'cartoon',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=TataSmart&backgroundColor=fed7aa',
  },

  // 4. Maskot Finansial TataDana
  {
    id: 'mascot-1',
    name: '🦊 Si Kancil Hemat',
    category: 'mascot',
    url: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=256&auto=format&fit=crop&q=80',
  },
  {
    id: 'mascot-2',
    name: '🦁 Pak Singa Cuan',
    category: 'mascot',
    url: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=256&auto=format&fit=crop&q=80',
  },
  {
    id: 'mascot-3',
    name: '🪙 Celengan Emas',
    category: 'mascot',
    url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=256&auto=format&fit=crop&q=80',
  },
];
