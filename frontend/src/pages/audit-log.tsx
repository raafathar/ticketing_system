import { CONFIG } from 'src/config-global';

import { AuditLogView } from 'src/sections/audit-log/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Audit Logs - ${CONFIG.appName}`}</title>

      <AuditLogView />
    </>
  );
}
