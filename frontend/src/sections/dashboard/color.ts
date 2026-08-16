import type { Theme } from '@mui/material/styles';
import type { LabelColor } from 'src/components/label/types';

// ----------------------------------------------------------------------

export const muiPaletteKey = {
  default: 'grey',
  primary: 'primary',
  secondary: 'secondary',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const satisfies Record<LabelColor, string>;

export const progressBarColor = {
  default: 'inherit',
  primary: 'primary',
  secondary: 'secondary',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const satisfies Record<LabelColor, string>;

export function muiPaletteEntry(theme: Theme, color: LabelColor): { main: string; mainChannel: string } {
  if (color === 'default') {
    const grey = theme.vars.palette.grey;
    return { main: grey[500], mainChannel: grey['500Channel'] };
  }
  return theme.vars.palette[color];
}
