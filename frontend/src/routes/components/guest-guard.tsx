import { useEffect } from 'react';

import { useRouter } from 'src/routes/hooks';

import { useAuth } from 'src/auth';

import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

type GuestGuardProps = {
  children: React.ReactNode;
};

export function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();

  const { user, initializing } = useAuth();

  useEffect(() => {
    if (!initializing && user) {
      router.replace('/');
    }
  }, [router, user, initializing]);

  if (initializing) {
    return <LoadingScreen />;
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
}
