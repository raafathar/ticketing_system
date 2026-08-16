import type { Ticket } from 'src/api/tickets';
import type { TicketCategory } from 'src/api/categories';
import type { MasterDataItem } from 'src/api/master-data';

import { useParams } from 'react-router';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { ticketsApi } from 'src/api/tickets';
import { categoriesApi } from 'src/api/categories';
import { masterDataApi } from 'src/api/master-data';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { TicketForm } from '../ticket-form';

// ----------------------------------------------------------------------

export function TicketEditView() {
  const router = useRouter();
  const { id } = useParams();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [departments, setDepartments] = useState<MasterDataItem[]>([]);
  const [locations, setLocations] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [ticketDetail, categoryList, depList, locList] = await Promise.all([
        ticketsApi.get(Number(id)),
        categoriesApi.list(),
        masterDataApi.departments(),
        masterDataApi.locations(),
      ]);
      setTicket(ticketDetail);
      setCategories(categoryList);
      setDepartments(depList);
      setLocations(locList);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaved = useCallback(
    (updated: Ticket) => {
      router.push(`/tickets/${updated.id}`);
    },
    [router]
  );

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Button
          color="inherit"
          startIcon={<Iconify icon="solar:alt-arrow-left-outline" />}
          onClick={() => router.push(`/tickets/${id}`)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">Edit ticket {ticket ? `- ${ticket.ticketNumber}` : ''}</Typography>
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

          {ticket && (
            <TicketForm
              ticket={ticket}
              categories={categories}
              departments={departments}
              locations={locations}
              onSaved={handleSaved}
            />
          )}
        </>
      )}
    </DashboardContent>
  );
}
