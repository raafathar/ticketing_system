import type { ParentCategory } from 'src/api/parent-categories';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { parentCategoriesApi } from 'src/api/parent-categories';

// ----------------------------------------------------------------------

type ParentCategoryFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  parentCategory?: ParentCategory | null;
};

export function ParentCategoryFormModal({
  open,
  onClose,
  onSaved,
  parentCategory,
}: ParentCategoryFormModalProps) {
  const isEdit = !!parentCategory;

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(parentCategory?.name ?? '');
      setIsActive(parentCategory?.isActive ?? true);
      setErrorMsg('');
    }
  }, [open, parentCategory]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMsg('');
      setSubmitting(true);
      try {
        const payload = { name: name.trim(), isActive };
        if (isEdit && parentCategory) {
          await parentCategoriesApi.update(parentCategory.id, payload);
        } else {
          await parentCategoriesApi.create(payload);
        }
        onSaved();
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to save parent category.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, parentCategory, name, isActive, onSaved]
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
          {isEdit ? 'Edit parent category' : 'New parent category'}
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
            <TextField
              fullWidth
              required
              autoFocus
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
            disabled={submitting || !name.trim()}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create parent category'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
