import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type ParentCategoryDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  submitting?: boolean;
};

export function ParentCategoryDeleteModal({
  open,
  onClose,
  onConfirm,
  itemName,
  submitting,
}: ParentCategoryDeleteModalProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete parent category</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Iconify width={28} icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
          <Typography variant="body2">
            Are you sure you want to delete{' '}
            <Typography component="span" variant="subtitle2">
              {itemName}
            </Typography>
            ? This action cannot be undone.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
        <Button color="inherit" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={submitting}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
