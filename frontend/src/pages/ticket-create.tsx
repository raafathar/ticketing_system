import { CONFIG } from 'src/config-global';

import { TicketCreateView } from 'src/sections/ticket/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`New Ticket - ${CONFIG.appName}`}</title>

      <TicketCreateView />
    </>
  );
}
