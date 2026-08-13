import type { Department } from 'src/api/departments';

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

import { departmentsApi } from 'src/api/departments';

// ----------------------------------------------------------------------

type DepartmentFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  department?: Department | null;
};

export function DepartmentFormModal({
  open,
  onClose,
  onSaved,
  department,
}: DepartmentFormModalProps) {
  const isEdit = !!department;

  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(department?.name ?? '');
      setErrorMsg('');
    }
  }, [open, department]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMsg('');
      setSubmitting(true);
      try {
        if (isEdit && department) {
          await departmentsApi.update(department.id, { name: name.trim() });
        } else {
          await departmentsApi.create({ name: name.trim() });
        }
        onSaved();
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to save department.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, department, name, onSaved]
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
          {isEdit ? 'Edit department' : 'New department'}
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
              'Create department'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
