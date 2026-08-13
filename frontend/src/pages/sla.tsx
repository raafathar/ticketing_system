import { CONFIG } from 'src/config-global';

import { SlaView } from 'src/sections/sla/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`SLA - ${CONFIG.appName}`}</title>

      <SlaView />
    </>
  );
}
