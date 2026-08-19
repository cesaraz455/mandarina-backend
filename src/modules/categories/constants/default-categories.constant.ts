import { CategoryType } from '@prisma/client';

export interface DefaultCategory {
  type: CategoryType;
  name: string;
  icon: string;
  color: string;
}

/**
 * Seeded on registration for every new user. The EXPENSE list mirrors the
 * canonical 18-category taxonomy defined in the Mandarina Design System
 * (CategoryBadge component + tokens/colors.css --cat-* values) so seeded
 * data matches the icon/color the design system itself renders. The DS has
 * no equivalent taxonomy for income, so the INCOME list is a product
 * proposal (leaf-green palette, since --cat-ingresos already aliases to
 * --leaf-600) rather than a 1:1 port.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    type: CategoryType.EXPENSE,
    name: 'Alimentación',
    icon: 'tools-kitchen-2',
    color: '#F7901F',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Arriendo',
    icon: 'building-estate',
    color: '#2F86CC',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Automóviles',
    icon: 'car',
    color: '#1FA39A',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Ayuda solidaria',
    icon: 'heart-handshake',
    color: '#E8638E',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Deudas',
    icon: 'credit-card-off',
    color: '#DE3C3C',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Educación',
    icon: 'school',
    color: '#7C6CF0',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Gastos de casa',
    icon: 'home',
    color: '#4FB07A',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Gym',
    icon: 'barbell',
    color: '#F2674A',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Inversiones',
    icon: 'chart-line',
    color: '#157A4E',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'No convencional',
    icon: 'grid-dots',
    color: '#B07CC9',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Autocuidado',
    icon: 'sparkles',
    color: '#D86FB8',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Préstamos',
    icon: 'coin',
    color: '#B85C3C',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Recibos',
    icon: 'receipt',
    color: '#6366C8',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Regalos',
    icon: 'gift',
    color: '#E24F8B',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Seguros',
    icon: 'shield-check',
    color: '#6B7585',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Salidas familiares',
    icon: 'users-group',
    color: '#E5A50A',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Viajes',
    icon: 'plane',
    color: '#16A0C4',
  },
  {
    type: CategoryType.EXPENSE,
    name: 'Pago TC',
    icon: 'credit-card',
    color: '#97A1B0',
  },

  {
    type: CategoryType.INCOME,
    name: 'Salario',
    icon: 'cash',
    color: '#54902B',
  },
  {
    type: CategoryType.INCOME,
    name: 'Freelance',
    icon: 'briefcase',
    color: '#68AC37',
  },
  {
    type: CategoryType.INCOME,
    name: 'Inversiones',
    icon: 'chart-line',
    color: '#427122',
  },
  {
    type: CategoryType.INCOME,
    name: 'Regalos',
    icon: 'gift',
    color: '#82BF4E',
  },
  {
    type: CategoryType.INCOME,
    name: 'Otros ingresos',
    icon: 'dots-circle-horizontal',
    color: '#345A1D',
  },
];
