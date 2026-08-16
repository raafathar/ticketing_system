import type { TicketUser } from 'src/api/tickets';
import type { TicketCategory } from 'src/api/categories';
import type { MasterDataItem } from 'src/api/master-data';

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

import { SLA_LABELS, STATUS_LABELS, PRIORITY_LABELS } from './utils';

// ----------------------------------------------------------------------

export type TicketFilters = {
  status: string;
  priority: string;
  categoryId: number | '';
  assigneeId: number | '';
  departmentId: number | '';
  locationId: number | '';
  slaStatus: string;
  created: string;
};

export const defaultFilters: TicketFilters = {
  status: 'ALL',
  priority: 'ALL',
  categoryId: '',
  assigneeId: '',
  departmentId: '',
  locationId: '',
  slaStatus: 'ALL',
  created: 'ALL',
};

const CREATED_OPTIONS = [
  { value: 'ALL', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

type TicketFiltersProps = {
  canReset: boolean;
  openFilter: boolean;
  filters: TicketFilters;
  categories: TicketCategory[];
  technicians: TicketUser[];
  departments: MasterDataItem[];
  locations: MasterDataItem[];
  onCloseFilter: () => void;
  onResetFilter: () => void;
  onSetFilters: (updateState: Partial<TicketFilters>) => void;
};

export function TicketFilters({
  filters,
  canReset,
  openFilter,
  categories,
  technicians,
  departments,
  locations,
  onSetFilters,
  onCloseFilter,
  onResetFilter,
}: TicketFiltersProps) {
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
        {[{ value: 'ALL', label: 'All' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))].map(
          (option) => (
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
          )
        )}
      </RadioGroup>
    </Stack>
  );

  const renderPriority = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Priority</Typography>
      <RadioGroup>
        {[{ value: 'ALL', label: 'All' }, ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))].map(
          (option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={
                <Radio
                  checked={filters.priority === option.value}
                  onChange={() => onSetFilters({ priority: option.value })}
                />
              }
              label={option.label}
            />
          )
        )}
      </RadioGroup>
    </Stack>
  );

  const renderSlaStatus = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">SLA status</Typography>
      <RadioGroup>
        {[{ value: 'ALL', label: 'All' }, ...Object.entries(SLA_LABELS).map(([value, label]) => ({ value, label }))].map(
          (option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={
                <Radio
                  checked={filters.slaStatus === option.value}
                  onChange={() => onSetFilters({ slaStatus: option.value })}
                />
              }
              label={option.label}
            />
          )
        )}
      </RadioGroup>
    </Stack>
  );

  const renderCategory = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Category</Typography>
      <FormControl fullWidth>
        <InputLabel>Category</InputLabel>
        <Select
          label="Category"
          value={filters.categoryId}
          onChange={(event) => onSetFilters({ categoryId: event.target.value as number | '' })}
        >
          <MenuItem value="">
            <Typography color="text.disabled">All</Typography>
          </MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const renderTechnician = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Technician</Typography>
      <FormControl fullWidth>
        <InputLabel>Technician</InputLabel>
        <Select
          label="Technician"
          value={filters.assigneeId}
          onChange={(event) => onSetFilters({ assigneeId: event.target.value as number | '' })}
        >
          <MenuItem value="">
            <Typography color="text.disabled">All</Typography>
          </MenuItem>
          {technicians.map((tech) => (
            <MenuItem key={tech.id} value={tech.id}>
              {tech.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const renderDepartment = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Department</Typography>
      <FormControl fullWidth>
        <InputLabel>Department</InputLabel>
        <Select
          label="Department"
          value={filters.departmentId}
          onChange={(event) => onSetFilters({ departmentId: event.target.value as number | '' })}
        >
          <MenuItem value="">
            <Typography color="text.disabled">All</Typography>
          </MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={department.id}>
              {department.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const renderLocation = (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Location</Typography>
      <FormControl fullWidth>
        <InputLabel>Location</InputLabel>
        <Select
          label="Location"
          value={filters.locationId}
          onChange={(event) => onSetFilters({ locationId: event.target.value as number | '' })}
        >
          <MenuItem value="">
            <Typography color="text.disabled">All</Typography>
          </MenuItem>
          {locations.map((location) => (
            <MenuItem key={location.id} value={location.id}>
              {location.name}
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
          {renderStatus}
          {renderPriority}
          {renderSlaStatus}
          {renderCategory}
          {renderTechnician}
          {renderDepartment}
          {renderLocation}
          {renderCreated}
        </Stack>
      </Scrollbar>
    </Drawer>
  );
}
