import { useAuth } from 'src/auth';

import { AdminDashboardView } from './admin-dashboard-view';
import { EmployeeDashboardView } from './employee-dashboard-view';
import { TechnicianDashboardView } from './technician-dashboard-view';

// ----------------------------------------------------------------------

export function DashboardView() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminDashboardView />;
  }

  if (user?.role === 'TECHNICIAN') {
    return <TechnicianDashboardView />;
  }

  return <EmployeeDashboardView />;
}
