import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

import { AuthGuard, GuestGuard } from './components';

// ----------------------------------------------------------------------

export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const AuditLogPage = lazy(() => import('src/pages/audit-log'));
export const TicketPage = lazy(() => import('src/pages/ticket'));
export const TicketCreatePage = lazy(() => import('src/pages/ticket-create'));
export const TicketEditPage = lazy(() => import('src/pages/ticket-edit'));
export const TicketDetailPage = lazy(() => import('src/pages/ticket-detail'));
export const UserPage = lazy(() => import('src/pages/user'));
export const DepartmentPage = lazy(() => import('src/pages/department'));
export const LocationPage = lazy(() => import('src/pages/location'));
export const SlaPage = lazy(() => import('src/pages/sla'));
export const CategoryPage = lazy(() => import('src/pages/category'));
export const ParentCategoryPage = lazy(() => import('src/pages/parent-category'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export const routesSection: RouteObject[] = [
  {
    element: (
      <AuthGuard>
        <DashboardLayout>
          <Suspense fallback={renderFallback()}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'audit-logs', element: <AuditLogPage /> },
      { path: 'tickets', element: <TicketPage /> },
      { path: 'tickets/create', element: <TicketCreatePage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
      { path: 'tickets/:id/edit', element: <TicketEditPage /> },
      { path: 'user', element: <UserPage /> },
      { path: 'department', element: <DepartmentPage /> },
      { path: 'location', element: <LocationPage /> },
      { path: 'sla', element: <SlaPage /> },
      { path: 'category', element: <CategoryPage /> },
      { path: 'parent-category', element: <ParentCategoryPage /> },
    ],
  },
  {
    path: 'sign-in',
    element: (
      <GuestGuard>
        <AuthLayout>
          <SignInPage />
        </AuthLayout>
      </GuestGuard>
    ),
  },
  {
    path: '404',
    element: <Page404 />,
  },
  { path: '*', element: <Page404 /> },
];
