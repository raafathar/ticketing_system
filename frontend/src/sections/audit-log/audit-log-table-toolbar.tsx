import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type AuditLogTableToolbarProps = {
  filterName: string;
  canReset: boolean;
  onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenFilter: () => void;
};

export function AuditLogTableToolbar({
  filterName,
  canReset,
  onFilterName,
  onOpenFilter,
}: AuditLogTableToolbarProps) {
  return (
    <Toolbar
      sx={{
        height: 96,
        display: 'flex',
        justifyContent: 'space-between',
        p: (theme) => theme.spacing(0, 1, 0, 3),
      }}
    >
      <OutlinedInput
        fullWidth
        value={filterName}
        onChange={onFilterName}
        placeholder="Search audit logs..."
        startAdornment={
          <InputAdornment position="start">
            <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        }
        sx={{ maxWidth: 320 }}
      />

      <Tooltip title="Filter list">
        <IconButton onClick={onOpenFilter}>
          <Badge color="error" variant="dot" invisible={!canReset}>
            <Iconify icon="ic:round-filter-list" />
          </Badge>
        </IconButton>
      </Tooltip>
    </Toolbar>
  );
}
