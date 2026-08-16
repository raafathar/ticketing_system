import type { Ticket } from 'src/api/tickets';
import type { TicketCategory } from 'src/api/categories';
import type { MasterDataItem } from 'src/api/master-data';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { categoriesApi } from 'src/api/categories';
import { masterDataApi } from 'src/api/master-data';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { TicketForm } from '../ticket-form';

// ----------------------------------------------------------------------

export function TicketCreateView() {
  const router = useRouter();

  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [departments, setDepartments] = useState<MasterDataItem[]>([]);
  const [locations, setLocations] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [categoryList, depList, locList] = await Promise.all([
        categoriesApi.list(),
        masterDataApi.departments(),
        masterDataApi.locations(),
      ]);
      setCategories(categoryList);
      setDepartments(depList);
      setLocations(locList);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load form data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  const handleSaved = useCallback(
    (ticket: Ticket) => {
      router.push(`/tickets/${ticket.id}`);
    },
    [router]
  );

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Button
          color="inherit"
          startIcon={<Iconify icon="solar:alt-arrow-left-outline" />}
          onClick={() => router.push('/tickets')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">New ticket</Typography>
      </Box>

      {loading ? (
        <Card sx={{ py: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Card>
      ) : (
        <>
          {!!errorMsg && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMsg}
            </Alert>
          )}

          <TicketForm
            categories={categories}
            departments={departments}
            locations={locations}
            onSaved={handleSaved}
          />
        </>
      )}
    </DashboardContent>
  );
}
