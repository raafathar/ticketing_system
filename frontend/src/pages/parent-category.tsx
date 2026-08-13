import { CONFIG } from 'src/config-global';

import { ParentCategoryView } from 'src/sections/parent-category/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Parent Categories - ${CONFIG.appName}`}</title>

      <ParentCategoryView />
    </>
  );
}
