import type { Location } from 'src/api/locations';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { locationsApi } from 'src/api/locations';

// ----------------------------------------------------------------------

type LocationFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  location?: Location | null;
};

export function LocationFormModal({ open, onClose, onSaved, location }: LocationFormModalProps) {
  const isEdit = !!location;

  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(location?.name ?? '');
      setErrorMsg('');
    }
  }, [open, location]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMsg('');
      setSubmitting(true);
      try {
        if (isEdit && location) {
          await locationsApi.update(location.id, { name: name.trim() });
        } else {
          await locationsApi.create({ name: name.trim() });
        }
        onSaved();
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to save location.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, location, name, onSaved]
  );

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
          {isEdit ? 'Edit location' : 'New location'}
        </DialogTitle>

        <DialogContent
          sx={{ px: 4, pb: 3, pt: '24px !important', overflowY: 'auto', minHeight: 0 }}
        >
          {!!errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {errorMsg}
            </Alert>
          )}

          <TextField
            fullWidth
            required
            autoFocus
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ px: 4, pt: 2, pb: 3, gap: 1.5 }}>
          <Button color="inherit" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="inherit"
            disabled={submitting || !name.trim()}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create location'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
