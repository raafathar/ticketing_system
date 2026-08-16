import type { AdminDashboard } from 'src/api/dashboard';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';

import { useAuth } from 'src/auth';
import { dashboardApi } from 'src/api/dashboard';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { slaLabel, priorityLabel, formatDuration } from 'src/sections/ticket/utils';

import { DashboardStatCard } from '../dashboard-stat-card';
import { DashboardTicketList } from '../dashboard-ticket-list';
import { DashboardActivityFeed } from '../dashboard-activity-feed';
import { AnalyticsCurrentVisits } from '../analytics-current-visits';
import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsCurrentSubject } from '../analytics-current-subject';
import { AnalyticsConversionRates } from '../analytics-conversion-rates';

// ----------------------------------------------------------------------

const toMinutes = (seconds: number | null) => (seconds == null ? 0 : Math.round(seconds / 60));

export function AdminDashboardView() {
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminDashboard | null>(null);

  useEffect(() => {
    let mounted = true;

    dashboardApi
      .admin()
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

  const { stats, trend, bySlaStatus, byCategory, byPriority, slaPerformance, technicianWorkload, atRisk, activity } = data;

  const active = stats.open + stats.inProgress + stats.pending;

  const trendCategories = trend.map((point) => fDate(point.date, 'DD MMM'));
  const trendCreated = trend.map((point) => point.created);
  const trendResolved = trend.map((point) => point.resolved);

  const slaPerf = slaPerformance.filter((item) => item.resolutionTargetSeconds != null);
  const slaPerfCategories = slaPerf.map((item) => priorityLabel(item.priority));

  const slaStatusData = ['ON_TRACK', 'WARNING', 'BREACHED']
    .map((status) => ({ label: slaLabel(status), value: bySlaStatus[status as keyof typeof bySlaStatus] }))
    .filter((item) => item.value > 0);

  const topWorkload = [...technicianWorkload].slice(0, 6);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Halo, {user?.name ?? 'Admin'} 👋
      </Typography>

      <Typography variant="body2" sx={{ mb: { xs: 3, md: 5 }, color: 'text.secondary' }}>
        Pantau performa helpdesk hari ini.
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
            title="Tiket Aktif"
            total={active}
            color="info"
            icon={<Iconify icon="solar:widget-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="SLA Terlambat"
            total={stats.slaBreached}
            color="error"
            icon={<Iconify icon="solar:alarm-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            title="Rata-rata Response"
            total={formatDuration(stats.avgResponseSeconds)}
            color="warning"
            icon={<Iconify icon="solar:stopwatch-bold" width={48} />}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <AnalyticsWebsiteVisits
            title="Tren Tiket Masuk vs Selesai"
            subheader="7 hari terakhir"
            type="bar"
            chart={{
              categories: trendCategories,
              series: [
                { name: 'Masuk', data: trendCreated },
                { name: 'Selesai', data: trendResolved },
              ],
              options: {
                plotOptions: {
                  bar: {
                    columnWidth: '50%',
                    borderRadius: 2,
                  },
                },
                tooltip: {
                  y: { formatter: (value: number) => `${value} tiket` },
                },
              },
            }}
          />
        </Grid>

        {slaStatusData.length > 0 && (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <AnalyticsCurrentVisits
              title="Status SLA"
              subheader="Tiket aktif berdasarkan status SLA"
              chart={{
                colors: [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main],
                series: slaStatusData,
              }}
            />
          </Grid>
        )}

        {slaPerf.length > 0 && (
          <Grid size={{ xs: 12, md: 6, lg: 8 }}>
            <AnalyticsConversionRates
              title="SLA: Target vs Aktual"
              subheader="Waktu response & resolusi per prioritas (menit)"
              chart={{
                colors: ['#078DEE', '#078DEE', '#FFAB00', '#FFAB00'],
                categories: slaPerfCategories,
                series: [
                  { name: 'Target Respons', data: slaPerf.map((item) => toMinutes(item.responseTargetSeconds)) },
                  { name: 'Aktual Respons', data: slaPerf.map((item) => toMinutes(item.avgResponseSeconds)) },
                  { name: 'Target Resolusi', data: slaPerf.map((item) => toMinutes(item.resolutionTargetSeconds)) },
                  { name: 'Aktual Resolusi', data: slaPerf.map((item) => toMinutes(item.avgResolutionSeconds)) },
                ],
                options: {
                  dataLabels: { enabled: false },
                  tooltip: {
                    y: { formatter: (value: number) => `${value} mnt`, title: { formatter: (seriesName: string) => `${seriesName}: ` } },
                  },
                },
              }}
            />
          </Grid>
        )}

        {topWorkload.length > 0 && (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <AnalyticsCurrentSubject
              title="Beban Kerja Teknisi"
              chart={{
                categories: topWorkload.map((item) => item.name),
                series: [
                  { name: 'Open', data: topWorkload.map((item) => item.open) },
                  { name: 'Selesai', data: topWorkload.map((item) => item.completed) },
                ],
              }}
            />
          </Grid>
        )}

        <Grid size={{ xs: 12, lg: 8 }}>
          <DashboardTicketList
            title="SLA At Risk"
            subheader="Diurutkan berdasarkan tenggat SLA"
            tickets={atRisk}
            showSlaTime
            emptyText="Tidak ada tiket aktif yang terancam SLA"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <DashboardActivityFeed title="Aktivitas Terbaru" list={activity} />
        </Grid>

        {trend.length === 0 &&
          byCategory.length === 0 &&
          byPriority.length === 0 &&
          activity.length === 0 && (
            <Grid size={12}>
              <Card>
                <CardHeader title="Belum ada data tiket untuk ditampilkan" />
              </Card>
            </Grid>
          )}
      </Grid>
    </DashboardContent>
  );
}
