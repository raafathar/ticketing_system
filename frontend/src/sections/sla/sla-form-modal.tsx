import type { SlaPolicy, SlaPriority } from 'src/api/sla';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { slaApi } from 'src/api/sla';

// ----------------------------------------------------------------------

const PRIORITY_OPTIONS: { value: SlaPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

type SlaFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  sla?: SlaPolicy | null;
};

export function SlaFormModal({ open, onClose, onSaved, sla }: SlaFormModalProps) {
  const isEdit = !!sla;

  const [priority, setPriority] = useState<SlaPriority>('LOW');
  const [responseMinutes, setResponseMinutes] = useState('');
  const [resolutionMinutes, setResolutionMinutes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPriority(sla?.priority ?? 'LOW');
      setResponseMinutes(sla ? String(sla.responseMinutes) : '');
      setResolutionMinutes(sla ? String(sla.resolutionMinutes) : '');
      setIsActive(sla?.isActive ?? true);
      setErrorMsg('');
    }
  }, [open, sla]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMsg('');
      setSubmitting(true);
      try {
        const payload = {
          priority,
          responseMinutes: Number(responseMinutes),
          resolutionMinutes: Number(resolutionMinutes),
          isActive,
        };
        if (isEdit && sla) {
          await slaApi.update(sla.id, payload);
        } else {
          await slaApi.create(payload);
        }
        onSaved();
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to save SLA.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, sla, priority, responseMinutes, resolutionMinutes, isActive, onSaved]
  );

  const canSubmit =
    !!priority &&
    !!responseMinutes &&
    Number(responseMinutes) > 0 &&
    !!resolutionMinutes &&
    Number(resolutionMinutes) > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      sx={{ '& .MuiDialog-paper': { maxWidth: 440 } }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}
      >
        <DialogTitle sx={{ pt: 3, pb: 2, px: 4 }}>
          {isEdit ? 'Edit SLA policy' : 'New SLA policy'}
        </DialogTitle>

        <DialogContent
          sx={{ px: 4, pb: 3, pt: '24px !important', overflowY: 'auto', minHeight: 0 }}
        >
          {!!errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {errorMsg}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                label="Priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as SlaPriority)}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              label="Response time"
              type="number"
              value={responseMinutes}
              onChange={(event) => setResponseMinutes(event.target.value)}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">min</InputAdornment> },
              }}
            />

            <TextField
              fullWidth
              required
              label="Resolution time"
              type="number"
              value={resolutionMinutes}
              onChange={(event) => setResolutionMinutes(event.target.value)}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">min</InputAdornment> },
              }}
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2">Active</Typography>
              <Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 4, pt: 2, pb: 3, gap: 1.5 }}>
          <Button color="inherit" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="inherit"
            disabled={submitting || !canSubmit}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create SLA'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
