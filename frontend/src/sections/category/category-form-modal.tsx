import type { TicketCategory } from 'src/api/categories';
import type { ParentCategory } from 'src/api/parent-categories';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { categoriesApi } from 'src/api/categories';
import { parentCategoriesApi } from 'src/api/parent-categories';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type CategoryFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  category?: TicketCategory | null;
  parentCategories: ParentCategory[];
  onParentCreated?: (parent: ParentCategory) => void;
};

export function CategoryFormModal({
  open,
  onClose,
  onSaved,
  category,
  parentCategories,
  onParentCreated,
}: CategoryFormModalProps) {
  const isEdit = !!category;

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [parentFormOpen, setParentFormOpen] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [parentError, setParentError] = useState('');
  const [parentSubmitting, setParentSubmitting] = useState(false);

  const parentOptions = parentCategories.filter((item) => item.id !== category?.id);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setParentId(category?.parentId ?? '');
      setIsActive(category?.isActive ?? true);
      setErrorMsg('');
      setParentFormOpen(false);
      setNewParentName('');
      setParentError('');
    }
  }, [open, category]);

  const handleToggleParentForm = useCallback(() => {
    setParentError('');
    setParentFormOpen((prev) => !prev);
  }, []);

  const handleCreateParent = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setParentError('');
      setParentSubmitting(true);
      try {
        const created = await parentCategoriesApi.create({ name: newParentName.trim() });
        onParentCreated?.(created);
        setParentId(created.id);
        setNewParentName('');
        setParentFormOpen(false);
      } catch (error) {
        setParentError(
          error instanceof Error ? error.message : 'Failed to create parent category.'
        );
      } finally {
        setParentSubmitting(false);
      }
    },
    [newParentName, onParentCreated]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMsg('');
      setSubmitting(true);
      try {
        const payload = {
          name: name.trim(),
          parentId: parentId === '' ? null : parentId,
          isActive,
        };
        if (isEdit && category) {
          await categoriesApi.update(category.id, payload);
        } else {
          await categoriesApi.create(payload);
        }
        onSaved();
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to save category.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, category, name, parentId, isActive, onSaved]
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
          {isEdit ? 'Edit category' : 'New category'}
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

            <FormControl fullWidth>
              <InputLabel>Parent category</InputLabel>
              <Select
                label="Parent category"
                value={parentId}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === undefined) return;
                  setParentId(value as number | '');
                }}
              >
                <MenuItem value="">
                  <Typography color="text.disabled">None</Typography>
                </MenuItem>
                {parentOptions.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={handleToggleParentForm} sx={{ color: 'primary.main' }}>
                  <Iconify icon="mingcute:add-line" />
                  Add new parent category
                </MenuItem>
              </Select>
            </FormControl>

            {parentFormOpen && (
              <Box
                component="form"
                onSubmit={handleCreateParent}
                sx={{ p: 2, borderRadius: 1, bgcolor: 'background.neutral' }}
              >
                {!!parentError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {parentError}
                  </Alert>
                )}

                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  New parent category
                </Typography>

                <TextField
                  fullWidth
                  required
                  autoFocus
                  label="Name"
                  value={newParentName}
                  onChange={(event) => setNewParentName(event.target.value)}
                />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 2 }}>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => setParentFormOpen(false)}
                    disabled={parentSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    type="submit"
                    variant="contained"
                    color="inherit"
                    disabled={parentSubmitting || !newParentName.trim()}
                  >
                    {parentSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Create'}
                  </Button>
                </Stack>
              </Box>
            )}

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
              'Create category'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
