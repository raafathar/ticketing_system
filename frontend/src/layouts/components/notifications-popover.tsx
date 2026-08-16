import type { Notification } from 'src/api/notifications';
import type { IconButtonProps } from '@mui/material/IconButton';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';

import { useRouter } from 'src/routes/hooks';

import { fToNow } from 'src/utils/format-time';

import { notificationsApi } from 'src/api/notifications';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export function NotificationsPopover({ sx, ...other }: IconButtonProps) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  const unreadItems = notifications.filter((item) => !item.isRead);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // keep previous data on error
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleOpenPopover = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpenPopover(event.currentTarget);
      loadNotifications();
    },
    [loadNotifications]
  );

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      // ignore
    }
  }, []);

  const handleClickItem = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
        );
        try {
          await notificationsApi.markRead(notification.id);
        } catch {
          // ignore
        }
      }
      handleClosePopover();
      if (notification.ticketId) {
        router.push(`/tickets/${notification.ticketId}`);
      }
    },
    [handleClosePopover, router]
  );

  return (
    <>
      <IconButton
        color={openPopover ? 'primary' : 'default'}
        onClick={handleOpenPopover}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Iconify width={24} icon="solar:bell-bing-bold-duotone" />
        </Badge>
      </IconButton>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box
          sx={{
            py: 2,
            pl: 2.5,
            pr: 1.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">Notifications</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Anda memiliki {unreadCount} notifikasi belum dibaca
            </Typography>
          </Box>

          {unreadCount > 0 && (
            <Tooltip title="Tandai semua terbaca">
              <IconButton color="primary" onClick={handleMarkAllAsRead}>
                <Iconify icon="eva:done-all-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Scrollbar fillContent sx={{ minHeight: 240, maxHeight: { xs: 360, sm: 'none' } }}>
          {unreadItems.length > 0 && (
            <List
              disablePadding
              subheader={
                <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                  Baru
                </ListSubheader>
              }
            >
              {unreadItems.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleClickItem(notification)}
                />
              ))}
            </List>
          )}

          {notifications.length - unreadItems.length > 0 && (
            <List
              disablePadding
              subheader={
                <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                  Sebelumnya
                </ListSubheader>
              }
            >
              {notifications
                .filter((item) => item.isRead)
                .map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleClickItem(notification)}
                  />
                ))}
            </List>
          )}

          {notifications.length === 0 && (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <Iconify icon="solar:bell-bing-bold-duotone" width={32} sx={{ color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Belum ada notifikasi
              </Typography>
            </Box>
          )}
        </Scrollbar>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button fullWidth disableRipple color="inherit" onClick={handleClosePopover}>
            Tutup
          </Button>
        </Box>
      </Popover>
    </>
  );
}

// ----------------------------------------------------------------------

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        py: 1.5,
        px: 2.5,
        mt: '1px',
        ...(!notification.isRead && {
          bgcolor: 'action.selected',
        }),
      }}
    >
      <ListItemAvatar>
        <NotificationAvatar type={notification.type} />
      </ListItemAvatar>
      <ListItemText
        primary={notification.title}
        secondary={
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              color: 'text.disabled',
            }}
          >
            <Iconify width={14} icon="solar:clock-circle-outline" />
            {fToNow(notification.createdAt)}
          </Typography>
        }
      />
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function NotificationAvatar({ type }: { type: string }) {
  const iconByType: Record<string, string> = {
    TICKET_CREATED: '/assets/icons/notification/ic-notification-package.svg',
    COMMENT: '/assets/icons/notification/ic-notification-chat.svg',
    ASSIGNED: '/assets/icons/notification/ic-notification-shipping.svg',
    STATUS_CHANGED: '/assets/icons/notification/ic-notification-mail.svg',
  };

  const src = iconByType[type];

  return (
    <Avatar sx={{ bgcolor: 'background.neutral' }}>
      {src ? (
        <img alt={type} src={src} />
      ) : (
        <Iconify icon="solar:bell-bing-bold-duotone" width={20} sx={{ color: 'text.secondary' }} />
      )}
    </Avatar>
  );
}