/**
 * Central Category Registry — Single Source of Truth.
 *
 * All 20 expense categories with their keys, display labels, icon names, and colors.
 * Backend validators, AI mapping, and frontend components all derive from this.
 */

const CATEGORIES = [
  { key: 'FOOD_DINING',       label: 'Food & Dining',       icon: 'Utensils',       color: '#ef4444' },
  { key: 'GROCERIES',         label: 'Groceries',           icon: 'ShoppingCart',   color: '#f97316' },
  { key: 'TRANSPORTATION',    label: 'Transportation',      icon: 'Car',            color: '#eab308' },
  { key: 'HOUSING_RENT',      label: 'Housing & Rent',      icon: 'Home',           color: '#22c55e' },
  { key: 'BILLS_UTILITIES',   label: 'Bills & Utilities',   icon: 'Zap',            color: '#14b8a6' },
  { key: 'HEALTHCARE',        label: 'Healthcare',          icon: 'HeartPulse',     color: '#06b6d4' },
  { key: 'EDUCATION',         label: 'Education',           icon: 'GraduationCap',  color: '#3b82f6' },
  { key: 'SHOPPING',          label: 'Shopping',            icon: 'ShoppingBag',    color: '#8b5cf6' },
  { key: 'ENTERTAINMENT',     label: 'Entertainment',       icon: 'Film',           color: '#a855f7' },
  { key: 'TRAVEL',            label: 'Travel',              icon: 'Plane',          color: '#d946ef' },
  { key: 'WORK_BUSINESS',     label: 'Work & Business',     icon: 'Briefcase',      color: '#ec4899' },
  { key: 'FITNESS_WELLNESS',  label: 'Fitness & Wellness',  icon: 'Dumbbell',       color: '#f43f5e' },
  { key: 'PETS',              label: 'Pets',                icon: 'PawPrint',       color: '#fb923c' },
  { key: 'GIFTS_DONATIONS',   label: 'Gifts & Donations',   icon: 'Gift',           color: '#a3e635' },
  { key: 'EMI_LOANS',         label: 'EMI & Loans',         icon: 'Landmark',       color: '#2dd4bf' },
  { key: 'INVESTMENTS',       label: 'Investments',         icon: 'TrendingUp',     color: '#38bdf8' },
  { key: 'INSURANCE',         label: 'Insurance',           icon: 'Shield',         color: '#818cf8' },
  { key: 'TAXES_GOVERNMENT',  label: 'Taxes & Government',  icon: 'Receipt',        color: '#c084fc' },
  { key: 'SUBSCRIPTIONS',     label: 'Subscriptions',       icon: 'Repeat',         color: '#e879f9' },
  { key: 'MISCELLANEOUS',     label: 'Miscellaneous',       icon: 'MoreHorizontal', color: '#64748b' },
];

const CATEGORY_KEYS = CATEGORIES.map(c => c.key);

const CATEGORY_MAP_BY_KEY = {};
for (const cat of CATEGORIES) {
  CATEGORY_MAP_BY_KEY[cat.key] = cat;
}

module.exports = { CATEGORIES, CATEGORY_KEYS, CATEGORY_MAP_BY_KEY };
