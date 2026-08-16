import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { actionColor } from './utils';

// ----------------------------------------------------------------------

export type AuditLogRowProps = {
  id: string;
  user: string;
  email: string;
  action: string;
  actionCode: string;
  entity: string;
  entityId: number | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
};

type AuditLogTableRowProps = {
  row: AuditLogRowProps;
  onView?: () => void;
};

export function AuditLogTableRow({ row, onView }: AuditLogTableRowProps) {
  return (
    <TableRow
      hover
      tabIndex={-1}
      onClick={onView}
      sx={{ ...(onView && { cursor: 'pointer' }) }}
    >
      <TableCell component="th" scope="row">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {row.user}
          </Typography>
          {row.email && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {row.email}
            </Typography>
          )}
        </Box>
      </TableCell>

      <TableCell>
        <Label color={actionColor(row.actionCode)}>{row.action}</Label>
      </TableCell>

      <TableCell>
        <Typography variant="body2">
          {row.entity}
          {row.entityId != null ? ` #${row.entityId}` : ''}
        </Typography>
      </TableCell>

      <TableCell>{fDateTime(row.createdAt)}</TableCell>
    </TableRow>
  );
}
