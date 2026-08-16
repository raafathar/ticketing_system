import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { ACTION_LABELS, ENTITY_LABELS } from './utils';

// ----------------------------------------------------------------------

export type AuditLogFilters = {
  action: string;
  entity: string;
};

export const defaultFilters: AuditLogFilters = {
  action: 'ALL',
  entity: 'ALL',
};

type AuditLogFiltersProps = {
  canReset: boolean;
  openFilter: boolean;
  filters: AuditLogFilters;
  onCloseFilter: () => void;
  onResetFilter: () => void;
  onSetFilters: (updateState: Partial<AuditLogFilters>) => void;
};

export function AuditLogFilters({
  filters,
  canReset,
  openFilter,
  onSetFilters,
  onCloseFilter,
  onResetFilter,
}: AuditLogFiltersProps) {
  const renderAction = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Action</Typography>
      <RadioGroup>
        {[{ value: 'ALL', label: 'All' }, ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))].map(
          (option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={
                <Radio
                  checked={filters.action === option.value}
                  onChange={() => onSetFilters({ action: option.value })}
                />
              }
              label={option.label}
            />
          )
        )}
      </RadioGroup>
    </Stack>
  );

  const renderEntity = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Entity</Typography>
      <RadioGroup>
        {[{ value: 'ALL', label: 'All' }, ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }))].map(
          (option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={
                <Radio
                  checked={filters.entity === option.value}
                  onChange={() => onSetFilters({ entity: option.value })}
                />
              }
              label={option.label}
            />
          )
        )}
      </RadioGroup>
    </Stack>
  );

  return (
    <Drawer
      anchor="right"
      open={openFilter}
      onClose={onCloseFilter}
      slotProps={{
        paper: {
          sx: { width: 280, overflow: 'hidden' },
        },
      }}
    >
      <Box
        sx={{
          py: 2,
          pl: 2.5,
          pr: 1.5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Filters
        </Typography>

        <IconButton onClick={onResetFilter}>
          <Badge color="error" variant="dot" invisible={!canReset}>
            <Iconify icon="solar:restart-bold" />
          </Badge>
        </IconButton>

        <IconButton onClick={onCloseFilter}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <Divider />

      <Scrollbar>
        <Stack spacing={3} sx={{ p: 3 }}>
          {renderAction}
          {renderEntity}
        </Stack>
      </Scrollbar>
    </Drawer>
  );
}
