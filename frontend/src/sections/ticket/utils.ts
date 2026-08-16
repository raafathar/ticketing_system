import type { Ticket } from 'src/api/tickets';
import type { LabelColor } from 'src/components/label/types';

import type { TicketProps } from './ticket-table-row';

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

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLORS: Record<string, LabelColor> = {
  NEW: 'info',
  OPEN: 'primary',
  IN_PROGRESS: 'secondary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
  CANCELLED: 'error',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_COLORS: Record<string, LabelColor> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

export const SLA_LABELS: Record<string, string> = {
  ON_TRACK: 'On Track',
  WARNING: 'Warning',
  BREACHED: 'Breached',
};

export const SLA_COLORS: Record<string, LabelColor> = {
  ON_TRACK: 'success',
  WARNING: 'warning',
  BREACHED: 'error',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusColor(status: string): LabelColor {
  return STATUS_COLORS[status] ?? 'default';
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function priorityColor(priority: string): LabelColor {
  return PRIORITY_COLORS[priority] ?? 'default';
}

export function slaLabel(slaStatus: string): string {
  return SLA_LABELS[slaStatus] ?? slaStatus;
}

export function slaColor(slaStatus: string): LabelColor {
  return SLA_COLORS[slaStatus] ?? 'default';
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function ticketToRow(ticket: Ticket): TicketProps {
  return {
    id: String(ticket.id),
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    requester: ticket.requester?.name ?? '-',
    assignee: ticket.assignee?.name ?? '-',
    category: ticket.category?.name ?? '-',
    priority: ticket.priority,
    status: ticket.status,
    slaStatus: ticket.slaStatus,
    createdAt: ticket.createdAt,
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
  inputData: TicketProps[];
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
      (item) =>
        item.ticketNumber.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        item.title.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        item.requester.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  return inputData;
}
