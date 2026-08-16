import type { BoxProps } from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';
import type { DashboardActionTicket, DashboardRecentTicket } from 'src/api/dashboard';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { useRouter } from 'src/routes/hooks';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { statusColor, statusLabel, priorityColor, priorityLabel } from 'src/sections/ticket/utils';

import { muiPaletteEntry } from './color';

// ----------------------------------------------------------------------

type TicketListItem = DashboardRecentTicket | DashboardActionTicket;

type Props = CardProps & {
  title?: string;
  subheader?: string;
  tickets: TicketListItem[];
  emptyText?: string;
  showViewAll?: boolean;
  showSlaTime?: boolean;
};

export function DashboardTicketList({
  title,
  subheader,
  tickets,
  emptyText = 'Belum ada tiket',
  showViewAll,
  showSlaTime,
  sx,
  ...other
}: Props) {
  const router = useRouter();

  return (
    <Card sx={[() => ({ height: '100%' }), ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 1 }} />

      <Scrollbar sx={{ minHeight: 400 }}>
        <Box sx={{ minWidth: 560 }}>
          {tickets.length ? (
            tickets.map((ticket) => (
              <Item
                key={ticket.id}
                ticket={ticket}
                showSlaTime={showSlaTime}
                onClick={() => router.push(`/tickets/${ticket.id}`)}
              />
            ))
          ) : (
            <Typography variant="body2" sx={{ px: 3, py: 5, textAlign: 'center', color: 'text.secondary' }}>
              {emptyText}
            </Typography>
          )}
        </Box>
      </Scrollbar>

      {showViewAll && (
        <Box sx={{ p: 2, textAlign: 'right' }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => router.push('/tickets')}
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
          >
            Lihat semua
          </Button>
        </Box>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

type ItemProps = BoxProps & {
  ticket: TicketListItem;
  showSlaTime?: boolean;
  onClick: () => void;
};

function Item({ ticket, showSlaTime, onClick, sx, ...other }: ItemProps) {
  const time = showSlaTime ? ticket.slaDueAt : ticket.createdAt;
  const timeColor = showSlaTime
    ? ticket.slaStatus === 'BREACHED'
      ? 'error.main'
      : ticket.slaStatus === 'WARNING'
        ? 'warning.main'
        : 'text.disabled'
    : 'text.disabled';
  return (
    <Box
      onClick={onClick}
      sx={[
        (theme) => ({
          py: 2,
          px: 3,
          gap: 2,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          transition: theme.transitions.create('background-color'),
          borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
          '&:hover': { bgcolor: 'action.hover' },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Avatar
        variant="rounded"
        sx={(theme) => {
          const color = muiPaletteEntry(theme, statusColor(ticket.status));
          return {
            width: 44,
            height: 44,
            flexShrink: 0,
            bgcolor: varAlpha(color.mainChannel, 0.16),
            color: color.main,
          };
        }}
      >
        <Iconify icon="solar:ticket-bold" width={24} />
      </Avatar>

      <ListItemText
        sx={{ minWidth: 0 }}
        primary={
          <Typography variant="subtitle2" noWrap sx={{ color: 'primary.main' }}>
            {ticket.ticketNumber}
          </Typography>
        }
        secondary={ticket.title}
        slotProps={{
          secondary: {
            noWrap: true,
            sx: { mt: 0.25, pr: 1 },
          },
        }}
      />

      <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
        <Label color={priorityColor(ticket.priority)}>{priorityLabel(ticket.priority)}</Label>
        <Label color={statusColor(ticket.status)}>{statusLabel(ticket.status)}</Label>
      </Box>

      <Typography variant="caption" sx={{ flexShrink: 0, color: timeColor }}>
        {fToNow(time)}
      </Typography>
    </Box>
  );
}
