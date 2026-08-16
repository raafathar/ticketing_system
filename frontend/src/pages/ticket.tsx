import { CONFIG } from 'src/config-global';

import { TicketView } from 'src/sections/ticket/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Tickets - ${CONFIG.appName}`}</title>

      <TicketView />
    </>
  );
}
