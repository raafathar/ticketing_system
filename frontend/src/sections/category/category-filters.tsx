import type { ParentCategory } from 'src/api/parent-categories';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export type CategoryFilters = {
  created: string;
  status: string;
  parent: number | '';
};

export const defaultFilters: CategoryFilters = {
  created: 'ALL',
  status: 'ALL',
  parent: '',
};

const CREATED_OPTIONS = [
  { value: 'ALL', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

type CategoryFiltersProps = {
  canReset: boolean;
  openFilter: boolean;
  filters: CategoryFilters;
  parents: ParentCategory[];
  onCloseFilter: () => void;
  onResetFilter: () => void;
  onSetFilters: (updateState: Partial<CategoryFilters>) => void;
};

export function CategoryFilters({
  filters,
  canReset,
  openFilter,
  parents,
  onSetFilters,
  onCloseFilter,
  onResetFilter,
}: CategoryFiltersProps) {
  const renderCreated = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Created</Typography>
      <RadioGroup>
        {CREATED_OPTIONS.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={
              <Radio
                checked={filters.created === option.value}
                onChange={() => onSetFilters({ created: option.value })}
              />
            }
            label={option.label}
          />
        ))}
      </RadioGroup>
    </Stack>
  );

  const renderStatus = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Status</Typography>
      <RadioGroup>
        {STATUS_OPTIONS.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={
              <Radio
                checked={filters.status === option.value}
                onChange={() => onSetFilters({ status: option.value })}
              />
            }
            label={option.label}
          />
        ))}
      </RadioGroup>
    </Stack>
  );

  const renderParent = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Parent category</Typography>
      <FormControl fullWidth>
        <InputLabel>Parent category</InputLabel>
        <Select
          label="Parent category"
          value={filters.parent}
          onChange={(event) => onSetFilters({ parent: event.target.value as number | '' })}
        >
          <MenuItem value="">
            <Typography color="text.disabled">All</Typography>
          </MenuItem>
          {parents.map((parent) => (
            <MenuItem key={parent.id} value={parent.id}>
              {parent.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
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
          {renderParent}
          {renderStatus}
          {renderCreated}
        </Stack>
      </Scrollbar>
    </Drawer>
  );
}
