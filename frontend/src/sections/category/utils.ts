import type { TicketCategory } from 'src/api/categories';

import type { CategoryProps } from './category-table-row';

// ----------------------------------------------------------------------

export const visuallyHidden = {
  border: 0,
  margin: -1,
  padding: 0,
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  clip: 'rect(0 0 0 0)',
} as const;

// ----------------------------------------------------------------------

export function withinCreatedAt(createdAt: string, filter: string): boolean {
  if (!filter || filter === 'ALL') return true;

  const time = new Date(createdAt).getTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  switch (filter) {
    case 'today': {
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      return time >= startOfToday;
    }
    case '7d':
      return time >= now - 7 * oneDay;
    case '30d':
      return time >= now - 30 * oneDay;
    default:
      return true;
  }
}

export function withinStatus(isActive: boolean, filter: string): boolean {
  if (!filter || filter === 'ALL') return true;
  return filter === 'active' ? isActive : !isActive;
}

export function categoryToRow(
  item: TicketCategory,
  parentNames?: Record<number, string>
): CategoryProps {
  return {
    id: String(item.id),
    name: item.name,
    parent: item.parentId != null ? (parentNames?.[item.parentId] ?? '-') : '-',
    status: item.isActive ? 'active' : 'inactive',
    createdAt: item.createdAt,
  };
}

// ----------------------------------------------------------------------

export function emptyRows(page: number, rowsPerPage: number, arrayLength: number) {
  return page ? Math.max(0, (1 + page) * rowsPerPage - arrayLength) : 0;
}

// ----------------------------------------------------------------------

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

// ----------------------------------------------------------------------

export function getComparator<Key extends keyof any>(
  order: 'asc' | 'desc',
  orderBy: Key
): (
  a: {
    [key in Key]: number | string;
  },
  b: {
    [key in Key]: number | string;
  }
) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  inputData: CategoryProps[];
  filterName: string;
  comparator: (a: any, b: any) => number;
};

export function applyFilter({ inputData, comparator, filterName }: ApplyFilterProps) {
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (filterName) {
    inputData = inputData.filter(
      (item) => item.name.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  return inputData;
}
