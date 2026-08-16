import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  info?: React.ReactNode;
  children?: NavItem[];
};

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Tickets',
    path: '/tickets',
    icon: icon('ic-ticket'),
  },
  {
    title: 'User',
    path: '/user',
    icon: icon('ic-user'),
  },
  {
    title: 'Audit Logs',
    path: '/audit-logs',
    icon: icon('ic-history'),
  },
  {
    title: 'Master Data',
    icon: icon('ic-master-data'),
    children: [
      { title: 'Department', path: '/department' },
      { title: 'Location', path: '/location' },
      { title: 'SLA', path: '/sla' },
      { title: 'Parent Category', path: '/parent-category' },
      { title: 'Category', path: '/category' },
    ],
  },
  {
    title: 'Not found',
    path: '/404',
    icon: icon('ic-disabled'),
  },
];
