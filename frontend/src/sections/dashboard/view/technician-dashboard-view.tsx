import type { TechnicianDashboard } from 'src/api/dashboard';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuth } from 'src/auth';
import { dashboardApi } from 'src/api/dashboard';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { formatDuration } from 'src/sections/ticket/utils';

import { DashboardStatCard } from '../dashboard-stat-card';
import { DashboardTicketList } from '../dashboard-ticket-list';
import { DashboardActivityFeed } from '../dashboard-activity-feed';
import { DashboardStatusBreakdown } from '../dashboard-status-breakdown';

// ----------------------------------------------------------------------

export function TechnicianDashboardView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TechnicianDashboard | null>(null);

  useEffect(() => {
    let mounted = true;

    dashboardApi
      .technician()
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <DashboardContent maxWidth="xl">
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error || !data) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="error" sx={{ mt: 3 }}>
          {error || 'Gagal memuat data dashboard'}
        </Alert>
      </DashboardContent>
    );
  }

  const { stats, actionNeeded, activity } = data;

  const breakdown = [
    { label: 'Open', value: stats.open, color: 'primary' as const },
    { label: 'In Progress', value: stats.inProgress, color: 'info' as const },
    { label: 'Pending', value: stats.pending, color: 'warning' as const },
    { label: 'Resolved', value: stats.resolved, color: 'success' as const },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Halo, {user?.name ?? 'Teknisi'} 👋
      </Typography>

      <Typography variant="body2" sx={{ mb: { xs: 3, md: 5 }, color: 'text.secondary' }}>
        Kelola tiket yang membutuhkan tindakan Anda.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Total Ditugaskan"
            total={stats.totalAssigned}
            color="primary"
            icon={<Iconify icon="solar:ticket-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Selesai Hari Ini"
            total={stats.resolvedToday}
            color="success"
            icon={<Iconify icon="solar:calendar-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="SLA Terlambat"
            total={stats.overdue}
            color="error"
            icon={<Iconify icon="solar:alarm-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Rata-rata Resolusi"
            total={formatDuration(stats.avgResolutionSeconds)}
            color="info"
            icon={<Iconify icon="solar:stopwatch-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <DashboardTicketList
            title="Perlu Tindakan"
            subheader="Prioritas berdasarkan tenggat SLA"
            tickets={actionNeeded}
            showViewAll
            emptyText="Tidak ada tiket yang membutuhkan tindakan"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <DashboardStatusBreakdown title="Status Tiket Saya" data={breakdown} />
        </Grid>

        <Grid size={12}>
          <DashboardActivityFeed
            title="Aktivitas Terbaru"
            subheader="Tiket yang ditugaskan kepada Anda"
            list={activity}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
