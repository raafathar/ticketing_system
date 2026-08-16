import type { StackProps } from '@mui/material/Stack';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function NavShortcut({ sx, ...other }: StackProps) {
  const router = useRouter();

  return (
    <Box
      sx={[
        {
          mb: 4,
          borderRadius: 2,
          p: 2.5,
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          bgcolor: 'background.neutral',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >

      <Button
        variant="contained"
        color="inherit"
        sx={{ mt: 2 }}
        startIcon={<Iconify icon="mingcute:add-line" />}
        onClick={() => router.push('/tickets/create')}
      >
        New Ticket
      </Button>
    </Box>
  );
}