import type { MasterDataItem } from 'src/api/master-data';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export type UserFilters = {
  role: string;
  status: string;
  departments: number[];
  locations: number[];
};

export const defaultFilters: UserFilters = {
  role: 'ALL',
  status: 'ALL',
  departments: [],
  locations: [],
};

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TECHNICIAN', label: 'Technician' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
];

type UserFiltersProps = {
  canReset: boolean;
  openFilter: boolean;
  filters: UserFilters;
  onCloseFilter: () => void;
  onResetFilter: () => void;
  onSetFilters: (updateState: Partial<UserFilters>) => void;
  departments: MasterDataItem[];
  locations: MasterDataItem[];
};

export function UserFilters({
  filters,
  canReset,
  openFilter,
  onSetFilters,
  onCloseFilter,
  onResetFilter,
  departments,
  locations,
}: UserFiltersProps) {
  const toggleDepartment = (value: number) => {
    const checked = filters.departments.includes(value)
      ? filters.departments.filter((item) => item !== value)
      : [...filters.departments, value];
    onSetFilters({ departments: checked });
  };

  const toggleLocation = (value: number) => {
    const checked = filters.locations.includes(value)
      ? filters.locations.filter((item) => item !== value)
      : [...filters.locations, value];
    onSetFilters({ locations: checked });
  };

  const renderRole = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Role</Typography>
      <RadioGroup>
        {ROLE_OPTIONS.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={
              <Radio
                checked={filters.role === option.value}
                onChange={() => onSetFilters({ role: option.value })}
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

  const renderDepartments = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Department</Typography>
      <FormGroup>
        {departments.map((department) => (
          <FormControlLabel
            key={department.id}
            control={
              <Checkbox
                checked={filters.departments.includes(department.id)}
                onChange={() => toggleDepartment(department.id)}
              />
            }
            label={department.name}
          />
        ))}
      </FormGroup>
    </Stack>
  );

  const renderLocations = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Location</Typography>
      <FormGroup>
        {locations.map((location) => (
          <FormControlLabel
            key={location.id}
            control={
              <Checkbox
                checked={filters.locations.includes(location.id)}
                onChange={() => toggleLocation(location.id)}
              />
            }
            label={location.name}
          />
        ))}
      </FormGroup>
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
            {renderRole}
            {renderStatus}
            {renderDepartments}
            {renderLocations}
          </Stack>
        </Scrollbar>
      </Drawer>
  );
}
