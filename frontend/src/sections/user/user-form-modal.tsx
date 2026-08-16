import type { Role } from 'src/auth/types';
import type { AdminUser } from 'src/api/users';
import type { MasterDataItem } from 'src/api/master-data';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
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
import CircularProgress from '@mui/material/CircularProgress';

import { usersApi } from 'src/api/users';

// ----------------------------------------------------------------------

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'TECHNICIAN', label: 'Technician' },
  { value: 'ADMIN', label: 'Admin' },
];

type UserFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: AdminUser | null;
  departments: MasterDataItem[];
  locations: MasterDataItem[];
};

export function UserFormModal({
  open,
  onClose,
  onSaved,
  user,
  departments,
  locations,
}: UserFormModalProps) {
  const isEdit = !!user;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setPassword('');
      setRole(user?.role ?? 'EMPLOYEE');
      setDepartmentId(user?.departmentId ?? '');
      setLocationId(user?.locationId ?? '');
      setIsActive(user?.isActive ?? true);
      setErrorMsg('');
    }
  }, [open, user]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMsg('');
      setSubmitting(true);
      try {
        if (isEdit && user) {
          await usersApi.update(user.id, {
            name: name.trim(),
            email: email.trim(),
            role,
            departmentId: departmentId === '' ? null : departmentId,
            locationId: locationId === '' ? null : locationId,
            isActive,
            ...(password ? { password } : {}),
          });
        } else {
          await usersApi.create({
            name: name.trim(),
            email: email.trim(),
            password,
            role,
            departmentId: departmentId === '' ? null : departmentId,
            locationId: locationId === '' ? null : locationId,
            isActive,
          });
        }
        onSaved();
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to save user.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, user, name, email, password, role, departmentId, locationId, isActive, onSaved]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{ '& .MuiDialog-paper': { maxWidth: 680 } }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}
      >
        <DialogTitle sx={{ pt: 3, pb: 2, px: 4 }}>
          {isEdit ? 'Edit user' : 'New user'}
        </DialogTitle>

        <DialogContent sx={{ px: 4, pb: 3, pt: '24px !important', overflowY: 'auto', minHeight: 0 }}>
          <Grid container spacing={2.5}>
            {!!errorMsg && (
              <Grid size={12}>
                <Alert severity="error">{errorMsg}</Alert>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                required
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                required
                label="Email address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                helperText={
                  isEdit
                    ? 'Leave empty to keep the current password.'
                    : 'At least 6 characters.'
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  {ROLE_OPTIONS.map((option) => (
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

            <Grid size={12}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">Active</Typography>
                <Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 4, pt: 2, pb: 3, gap: 1.5 }}>
          <Button color="inherit" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="inherit"
            disabled={submitting || !name.trim() || !email.trim()}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create user'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
