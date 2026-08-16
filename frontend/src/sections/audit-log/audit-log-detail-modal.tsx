import type { AuditLog } from 'src/api/audit-logs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { actionColor, actionLabel, entityLabel, formatValue } from './utils';

// ----------------------------------------------------------------------

type AuditLogDetailModalProps = {
  open: boolean;
  log: AuditLog | null;
  onClose: () => void;
};

export function AuditLogDetailModal({ open, log, onClose }: AuditLogDetailModalProps) {
  if (!log) {
    return null;
  }

  const entity = entityLabel(log.entity);
  const action = actionLabel(log.action);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pt: 3, pb: 2, px: 4 }}>Audit log details</DialogTitle>

      <DialogContent sx={{ px: 4, pb: 3, pt: '24px !important' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Label color={actionColor(log.action)}>{action}</Label>
          <Typography variant="subtitle2">
            {entity}
            {log.entityId != null ? ` #${log.entityId}` : ''}
          </Typography>
        </Stack>

        <Stack spacing={2.5}>
          <DetailRow label="User" value={log.user ? `${log.user.name} (${log.user.email})` : 'System'} />
          <DetailRow label="IP address" value={log.ipAddress ?? '-'} />
          <DetailRow label="Timestamp" value={fDateTime(log.createdAt)} />

          <DetailValue label="Old value" value={formatValue(log.oldValue)} />
          <DetailValue label="New value" value={formatValue(log.newValue)} />

          <DetailValue label="User agent" value={log.userAgent ?? '-'} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 4, pt: 1, pb: 3, gap: 1.5 }}>
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
      <Typography variant="caption" sx={{ color: 'text.disabled', width: 100, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

type DetailValueProps = {
  label: string;
  value: string;
};

function DetailValue({ label, value }: DetailValueProps) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        sx={{
          p: 1.5,
          maxHeight: 180,
          overflow: 'auto',
          borderRadius: 1,
          bgcolor: 'background.neutral',
        }}
      >
        <Typography
          variant="body2"
          component="pre"
          sx={{
            m: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: (theme) => theme.typography.fontFamily,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
