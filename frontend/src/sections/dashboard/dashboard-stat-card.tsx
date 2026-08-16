import type { CardProps } from '@mui/material/Card';
import type { PaletteColorKey } from 'src/theme/core';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  total: number | string;
  subtitle?: string;
  color?: PaletteColorKey;
  icon: React.ReactNode;
};

export function DashboardStatCard({
  sx,
  icon,
  title,
  total,
  subtitle,
  color = 'primary',
  ...other
}: Props) {
  const theme = useTheme();

  return (
    <Card
      sx={[
        () => ({
          p: 3,
          boxShadow: 'none',
          position: 'relative',
          color: `${color}.darker`,
          backgroundColor: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ width: 48, height: 48, mb: 3, display: 'flex', alignItems: 'center' }}>{icon}</Box>

      <Box sx={{ typography: 'subtitle2' }}>{title}</Box>

      <Box sx={{ mt: 0.5, typography: 'h4' }}>
        {typeof total === 'number' ? fNumber(total) : total}
      </Box>

      {subtitle && (
        <Box sx={{ mt: 1, typography: 'caption', color: 'text.disabled' }}>{subtitle}</Box>
      )}

      <SvgColor
        src="/assets/background/shape-square.svg"
        sx={{
          top: 0,
          left: -20,
          width: 240,
          zIndex: -1,
          height: 240,
          opacity: 0.24,
          position: 'absolute',
          color: `${color}.main`,
        }}
      />
    </Card>
  );
}
