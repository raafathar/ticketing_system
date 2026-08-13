import { CONFIG } from 'src/config-global';

import { DepartmentView } from 'src/sections/department/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Departments - ${CONFIG.appName}`}</title>

      <DepartmentView />
    </>
  );
}
