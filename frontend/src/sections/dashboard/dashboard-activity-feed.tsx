import type { BoxProps } from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';
import type { DashboardActivity } from 'src/api/dashboard';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { useRouter } from 'src/routes/hooks';

import { fToNow } from 'src/utils/format-time';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  list: DashboardActivity[];
  emptyText?: string;
};

export function DashboardActivityFeed({ title, subheader, list, emptyText = 'Belum ada aktivitas', sx, ...other }: Props) {
  return (
    <Card sx={[() => ({ height: '100%' }), ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 1 }} />

      <Scrollbar sx={{ minHeight: 400 }}>
        <Box sx={{ minWidth: 460 }}>
          {list.length ? (
            list.map((item) => <Item key={item.id} item={item} />)
          ) : (
            <Typography
              variant="body2"
              sx={{ px: 3, py: 5, textAlign: 'center', color: 'text.secondary' }}
            >
              {emptyText}
            </Typography>
          )}
        </Box>
      </Scrollbar>
    </Card>
  );
}

// ----------------------------------------------------------------------

type ItemProps = BoxProps & {
  item: DashboardActivity;
};

function Item({ item, sx, ...other }: ItemProps) {
  const router = useRouter();
  const actor = item.user?.name ?? 'Sistem';

  return (
    <Box
      sx={[
        (theme) => ({
          py: 2,
          px: 3,
          gap: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Avatar
        sx={(theme) => ({
          width: 40,
          height: 40,
          flexShrink: 0,
          bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
          color: theme.vars.palette.primary.main,
          typography: 'subtitle1',
        })}
      >
        {actor.charAt(0).toUpperCase()}
      </Avatar>

      <ListItemText
        sx={{ minWidth: 0 }}
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" noWrap>
              {actor}
            </Typography>
            <Typography
              variant="subtitle2"
              noWrap
              component="span"
              sx={{ cursor: 'pointer', color: 'primary.main' }}
              onClick={() => router.push(`/tickets/${item.ticket.id}`)}
            >
              {item.ticket.ticketNumber}
            </Typography>
          </Box>
        }
        secondary={item.description || item.action}
        slotProps={{
          secondary: {
            noWrap: true,
            sx: { mt: 0.25, pr: 1 },
          },
        }}
      />

      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {fToNow(item.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}
