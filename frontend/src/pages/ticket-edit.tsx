import { CONFIG } from 'src/config-global';

import { TicketEditView } from 'src/sections/ticket/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Edit Ticket - ${CONFIG.appName}`}</title>

      <TicketEditView />
    </>
  );
}
