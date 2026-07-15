import {
  Utensils, ShoppingCart, Car, Home, Zap, HeartPulse, GraduationCap,
  ShoppingBag, Film, Plane, Briefcase, Dumbbell, PawPrint, Gift,
  Landmark, TrendingUp, Shield, Receipt, Repeat, MoreHorizontal,
  type LucideIcon
} from 'lucide-react';

export interface CategoryDef {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'FOOD_DINING',       label: 'Food & Dining',       icon: Utensils,       color: '#ef4444' },
  { key: 'GROCERIES',         label: 'Groceries',           icon: ShoppingCart,   color: '#f97316' },
  { key: 'TRANSPORTATION',    label: 'Transportation',      icon: Car,            color: '#eab308' },
  { key: 'HOUSING_RENT',      label: 'Housing & Rent',      icon: Home,           color: '#22c55e' },
  { key: 'BILLS_UTILITIES',   label: 'Bills & Utilities',   icon: Zap,            color: '#14b8a6' },
  { key: 'HEALTHCARE',        label: 'Healthcare',          icon: HeartPulse,     color: '#06b6d4' },
  { key: 'EDUCATION',         label: 'Education',           icon: GraduationCap,  color: '#3b82f6' },
  { key: 'SHOPPING',          label: 'Shopping',            icon: ShoppingBag,    color: '#8b5cf6' },
  { key: 'ENTERTAINMENT',     label: 'Entertainment',       icon: Film,           color: '#a855f7' },
  { key: 'TRAVEL',            label: 'Travel',              icon: Plane,          color: '#d946ef' },
  { key: 'WORK_BUSINESS',     label: 'Work & Business',     icon: Briefcase,      color: '#ec4899' },
  { key: 'FITNESS_WELLNESS',  label: 'Fitness & Wellness',  icon: Dumbbell,       color: '#f43f5e' },
  { key: 'PETS',              label: 'Pets',                icon: PawPrint,       color: '#fb923c' },
  { key: 'GIFTS_DONATIONS',   label: 'Gifts & Donations',   icon: Gift,           color: '#a3e635' },
  { key: 'EMI_LOANS',         label: 'EMI & Loans',         icon: Landmark,       color: '#2dd4bf' },
  { key: 'INVESTMENTS',       label: 'Investments',         icon: TrendingUp,     color: '#38bdf8' },
  { key: 'INSURANCE',         label: 'Insurance',           icon: Shield,         color: '#818cf8' },
  { key: 'TAXES_GOVERNMENT',  label: 'Taxes & Government',  icon: Receipt,        color: '#c084fc' },
  { key: 'SUBSCRIPTIONS',     label: 'Subscriptions',       icon: Repeat,         color: '#e879f9' },
  { key: 'MISCELLANEOUS',     label: 'Miscellaneous',       icon: MoreHorizontal, color: '#64748b' },
];

export const CATEGORY_KEYS = CATEGORIES.map(c => c.key);

export const CATEGORY_MAP: Record<string, CategoryDef> = {};
for (const cat of CATEGORIES) {
  CATEGORY_MAP[cat.key] = cat;
}

/**
 * Get category definition by key. Falls back to MISCELLANEOUS.
 */
export function getCategoryDef(key: string): CategoryDef {
  return CATEGORY_MAP[key] || CATEGORY_MAP['MISCELLANEOUS'];
}

/**
 * Get color array in category order (for charts).
 */
export const CATEGORY_COLORS = CATEGORIES.map(c => c.color);
