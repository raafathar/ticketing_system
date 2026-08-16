import type { EmployeeDashboard } from 'src/api/dashboard';

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

import { DashboardStatCard } from '../dashboard-stat-card';
import { DashboardTicketList } from '../dashboard-ticket-list';
import { DashboardActivityFeed } from '../dashboard-activity-feed';
import { DashboardStatusBreakdown } from '../dashboard-status-breakdown';

// ----------------------------------------------------------------------

export function EmployeeDashboardView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<EmployeeDashboard | null>(null);

  useEffect(() => {
    let mounted = true;

    dashboardApi
      .employee()
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

  const { stats, recentTickets, activity } = data;

  const breakdown = [
    { label: 'New', value: stats.new, color: 'info' as const },
    { label: 'Open', value: stats.open, color: 'primary' as const },
    { label: 'In Progress', value: stats.inProgress, color: 'secondary' as const },
    { label: 'Pending', value: stats.pending, color: 'warning' as const },
    { label: 'Resolved', value: stats.resolved, color: 'success' as const },
    { label: 'Closed', value: stats.closed, color: 'default' as const },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Halo, {user?.name ?? 'Karyawan'} 👋
      </Typography>

      <Typography variant="body2" sx={{ mb: { xs: 3, md: 5 }, color: 'text.secondary' }}>
        Pantau status tiket yang Anda ajukan.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Total Tiket"
            total={stats.total}
            color="primary"
            icon={<Iconify icon="solar:ticket-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Open"
            total={stats.open}
            color="info"
            icon={<Iconify icon="solar:widget-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="In Progress"
            total={stats.inProgress}
            color="secondary"
            icon={<Iconify icon="solar:clock-circle-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Resolved"
            total={stats.resolved}
            color="success"
            icon={<Iconify icon="solar:check-circle-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <DashboardTicketList
            title="Tiket Terbaru"
            tickets={recentTickets}
            showViewAll
            emptyText="Belum ada tiket yang Anda ajukan"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <DashboardStatusBreakdown title="Status Tiket Saya" data={breakdown} />
        </Grid>

        <Grid size={12}>
          <DashboardActivityFeed
            title="Aktivitas Terbaru"
            subheader="Tiket yang Anda ajukan"
            list={activity}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
