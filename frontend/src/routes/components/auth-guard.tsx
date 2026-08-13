import { useEffect } from 'react';

import { useRouter } from 'src/routes/hooks';

import { useAuth } from 'src/auth';

import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();

  const { user, initializing } = useAuth();

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/sign-in');
    }
  }, [router, user, initializing]);

  if (initializing) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
