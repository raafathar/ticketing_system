import type { AuditLog } from 'src/api/audit-logs';
import type { LabelColor } from 'src/components/label/types';

import type { AuditLogRowProps } from './audit-log-table-row';

// ----------------------------------------------------------------------

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  ASSIGN: 'Assign',
  CHANGE_STATUS: 'Change Status',
  CHANGE_PRIORITY: 'Change Priority',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
};

export const ACTION_COLORS: Record<string, LabelColor> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  ASSIGN: 'warning',
  CHANGE_STATUS: 'secondary',
  CHANGE_PRIORITY: 'primary',
  LOGIN: 'success',
  LOGOUT: 'default',
};

export function actionColor(action: string): LabelColor {
  return ACTION_COLORS[action] ?? 'default';
}

export const ENTITY_LABELS: Record<string, string> = {
  ticket: 'Ticket',
  user: 'User',
  category: 'Category',
  'parent-category': 'Parent Category',
  department: 'Department',
  location: 'Location',
  sla: 'SLA',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

export function shortenValue(value: string | null, maxLength = 60): string {
  if (!value) return '-';
  const cleaned = value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  return cleaned;
}

export function formatValue(value: string | null): string {
  if (!value) return '-';
  try {
    const parsed = JSON.parse(value);
    if (parsed !== null && typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2);
    }
    return String(parsed);
  } catch {
    return value;
  }
}

export function auditLogToRow(log: AuditLog): AuditLogRowProps {
  return {
    id: String(log.id),
    user: log.user?.name ?? 'System',
    email: log.user?.email ?? '',
    action: actionLabel(log.action),
    actionCode: log.action,
    entity: entityLabel(log.entity),
    entityId: log.entityId ?? null,
    oldValue: log.oldValue,
    newValue: log.newValue,
    ipAddress: log.ipAddress ?? '-',
    userAgent: log.userAgent ?? '-',
    createdAt: log.createdAt,
  };
}

// ----------------------------------------------------------------------

export function emptyRows(page: number, rowsPerPage: number, arrayLength: number) {
  return page ? Math.max(0, (1 + page) * rowsPerPage - arrayLength) : 0;
}

// ----------------------------------------------------------------------

export function applyFilter(inputData: AuditLogRowProps[], filterName: string): AuditLogRowProps[] {
  if (!filterName) return inputData;
  const q = filterName.toLowerCase();
  return inputData.filter(
    (item) =>
      item.user.toLowerCase().indexOf(q) !== -1 ||
      item.action.toLowerCase().indexOf(q) !== -1 ||
      item.entity.toLowerCase().indexOf(q) !== -1 ||
      (item.entityId != null && String(item.entityId).indexOf(q) !== -1) ||
      (item.ipAddress !== '-' && item.ipAddress.toLowerCase().indexOf(q) !== -1)
  );
}
