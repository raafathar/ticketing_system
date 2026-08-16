import { CONFIG } from 'src/config-global';

import { TicketDetailView } from 'src/sections/ticket/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Ticket Detail - ${CONFIG.appName}`}</title>

      <TicketDetailView />
    </>
  );
}
