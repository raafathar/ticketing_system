import type { Ticket } from 'src/api/tickets';
import type { TicketCategory } from 'src/api/categories';
import type { MasterDataItem } from 'src/api/master-data';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';

import { ticketsApi } from 'src/api/tickets';

import { PRIORITY_LABELS } from './utils';

// ----------------------------------------------------------------------

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

type TicketFormProps = {
  ticket?: Ticket | null;
  categories: TicketCategory[];
  departments: MasterDataItem[];
  locations: MasterDataItem[];
  onSaved: (ticket: Ticket) => void;
};

export function TicketForm({
  ticket,
  categories,
  departments,
  locations,
  onSaved,
}: TicketFormProps) {
  const isEdit = !!ticket;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [priority, setPriority] = useState('MEDIUM');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTitle(ticket?.title ?? '');
    setDescription(ticket?.description ?? '');
    setCategoryId(ticket?.categoryId ?? '');
    setPriority(ticket?.priority ?? 'MEDIUM');
    setDepartmentId(ticket?.departmentId ?? '');
    setLocationId(ticket?.locationId ?? '');
    setDueDate(ticket?.dueDate ? String(ticket.dueDate).slice(0, 10) : '');
    setErrorMsg('');
  }, [ticket]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMsg('');
      setSubmitting(true);
      try {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          categoryId: categoryId === '' ? null : categoryId,
          priority,
          departmentId: departmentId === '' ? null : departmentId,
          locationId: locationId === '' ? null : locationId,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        };
        if (isEdit && ticket) {
          const updated = await ticketsApi.update(ticket.id, payload);
          onSaved(updated);
        } else {
          const created = await ticketsApi.create(payload);
          onSaved(created);
        }
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to save ticket.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, ticket, title, description, categoryId, priority, departmentId, locationId, dueDate, onSaved]
  );

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Card sx={{ p: 4 }}>
        {!!errorMsg && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMsg}
          </Alert>
        )}

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Summary of the issue"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              multiline
              minRows={4}
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the problem in detail"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value as number | '')}
              >
                <MenuItem value="">
                  <Typography color="text.disabled">None</Typography>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                label="Priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                label="Department"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value as number | '')}
              >
                <MenuItem value="">
                  <Typography color="text.disabled">None</Typography>
                </MenuItem>
                {departments.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Location</InputLabel>
              <Select
                label="Location"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value as number | '')}
              >
                <MenuItem value="">
                  <Typography color="text.disabled">None</Typography>
                </MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="date"
              label="Due date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 4 }}>
          <Button type="button" color="inherit" onClick={() => window.history.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="inherit"
            disabled={submitting || !title.trim() || !description.trim()}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create ticket'
            )}
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
