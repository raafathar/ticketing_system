import type { CardProps } from '@mui/material/Card';
import type { LabelColor } from 'src/components/label/types';
import type { LinearProgressProps } from '@mui/material/LinearProgress';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { muiPaletteEntry, progressBarColor } from './color';

// ----------------------------------------------------------------------

export type DashboardBreakdownItem = {
  label: string;
  value: number;
  color: LabelColor;
};

type Props = CardProps & {
  title?: string;
  subheader?: string;
  data: DashboardBreakdownItem[];
};

export function DashboardStatusBreakdown({ title, subheader, data, sx, ...other }: Props) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card sx={[() => ({ height: '100%' }), ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box sx={{ p: 3, pt: 0, gap: 2, display: 'flex', flexDirection: 'column' }}>
        {data.map((item) => (
          <Box key={item.label}>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.label}
              </Typography>

              <Typography variant="subtitle2">{item.value}</Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={(item.value / max) * 100}
              color={progressBarColor[item.color] as LinearProgressProps['color']}
              sx={(theme) => {
                const color = muiPaletteEntry(theme, item.color);
                return {
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: varAlpha(color.mainChannel, 0.12),
                  '& .MuiLinearProgress-bar': { borderRadius: 3 },
                };
              }}
            />
          </Box>
        ))}
      </Box>
    </Card>
  );
}
