import { CONFIG } from 'src/config-global';

import { LocationView } from 'src/sections/location/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Locations - ${CONFIG.appName}`}</title>

      <LocationView />
    </>
  );
}
