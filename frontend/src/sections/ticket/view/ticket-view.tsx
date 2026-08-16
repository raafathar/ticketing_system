import type { Ticket } from 'src/api/tickets';
import type { TicketCategory } from 'src/api/categories';
import type { MasterDataItem } from 'src/api/master-data';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useAuth } from 'src/auth';
import { usersApi } from 'src/api/users';
import { ticketsApi } from 'src/api/tickets';
import { categoriesApi } from 'src/api/categories';
import { masterDataApi } from 'src/api/master-data';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { TicketTableRow } from '../ticket-table-row';
import { TicketTableHead } from '../ticket-table-head';
import { TicketDeleteModal } from '../ticket-delete-modal';
import { TicketTableToolbar } from '../ticket-table-toolbar';
import { TicketFilters, defaultFilters } from '../ticket-filters';
import { emptyRows, ticketToRow, applyFilter, getComparator } from '../utils';

import type { TicketProps } from '../ticket-table-row';
import type { TicketFilters as TicketFiltersType } from '../ticket-filters';

// ----------------------------------------------------------------------

export function TicketView() {
  const table = useTable();

  const router = useRouter();
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [departments, setDepartments] = useState<MasterDataItem[]>([]);
  const [locations, setLocations] = useState<MasterDataItem[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<TicketFiltersType>(defaultFilters);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [list, categoryList, depList, locList, userList] = await Promise.all([
        ticketsApi.list({ pageSize: 100 }),
        categoriesApi.list(),
        masterDataApi.departments(),
        masterDataApi.locations(),
        usersApi.list(),
      ]);
      setTickets(list.items);
      setCategories(categoryList);
      setDepartments(depList);
      setLocations(locList);
      setTechnicians(
        userList
          .filter((user) => user.role !== 'EMPLOYEE')
          .map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role }))
      );
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const withinCreatedAt = (createdAt: string, filter: string): boolean => {
    if (!filter || filter === 'ALL') return true;
    const time = new Date(createdAt).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    switch (filter) {
      case 'today': {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        return time >= startOfToday;
      }
      case '7d':
        return time >= now - 7 * oneDay;
      case '30d':
        return time >= now - 30 * oneDay;
      default:
        return true;
    }
  };

  const dataFiltered: TicketProps[] = applyFilter({
    inputData: tickets
      .filter((item) => withinCreatedAt(item.createdAt, filters.created))
      .filter((item) => filters.status === 'ALL' || item.status === filters.status)
      .filter((item) => filters.priority === 'ALL' || item.priority === filters.priority)
      .filter((item) => filters.slaStatus === 'ALL' || item.slaStatus === filters.slaStatus)
      .filter((item) => filters.categoryId === '' || item.categoryId === filters.categoryId)
      .filter((item) => filters.assigneeId === '' || item.assigneeId === filters.assigneeId)
      .filter((item) => filters.departmentId === '' || item.departmentId === filters.departmentId)
      .filter((item) => filters.locationId === '' || item.locationId === filters.locationId)
      .map(ticketToRow),
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  const canReset = Object.keys(filters).some(
    (key) => filters[key as keyof TicketFiltersType] !== defaultFilters[key as keyof TicketFiltersType]
  );

  const handleSetFilters = useCallback((updateState: Partial<TicketFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleOpenDelete = useCallback((ticket: Ticket) => {
    setDeletingTicket(ticket);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingTicket) return;
    setSubmitting(true);
    try {
      await ticketsApi.remove(deletingTicket.id);
      setDeleteOpen(false);
      setDeletingTicket(null);
      fetchData();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete ticket.');
    } finally {
      setSubmitting(false);
    }
  }, [deletingTicket, fetchData]);

  const handleDeleteSelected = useCallback(async () => {
    if (!table.selected.length) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await Promise.all(table.selected.map((id) => ticketsApi.remove(Number(id))));
      table.onSelectAllRows(false, []);
      table.onResetPage();
      fetchData();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete selected tickets.');
    } finally {
      setSubmitting(false);
    }
  }, [table, fetchData]);

  return (
    <DashboardContent>
      <Box
        sx={{
          mb: 5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Tickets
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push('/tickets/create')}
        >
          New ticket
        </Button>
      </Box>

      <Card>
        <TicketTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          canReset={canReset}
          onOpenFilter={() => setOpenFilter(true)}
          onDeleteSelected={isAdmin ? handleDeleteSelected : undefined}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
        />

        {loading ? (
          <Box
            sx={{
              py: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {!!errorMsg && (
              <Alert severity="error" sx={{ m: 3 }}>
                {errorMsg}
              </Alert>
            )}

            <Scrollbar>
              <TableContainer sx={{ overflow: 'unset' }}>
                <Table sx={{ minWidth: 1100 }}>
                  <TicketTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(
                        checked,
                        dataFiltered.map((ticket) => ticket.id)
                      )
                    }
                    headLabel={[
                      { id: 'ticketNumber', label: 'Ticket' },
                      { id: 'requester', label: 'Requester' },
                      { id: 'assignee', label: 'Assignee' },
                      { id: 'category', label: 'Category' },
                      { id: 'priority', label: 'Priority' },
                      { id: 'status', label: 'Status' },
                      { id: 'slaStatus', label: 'SLA' },
                      { id: 'createdAt', label: 'Created at' },
                      { id: '' },
                    ]}
                  />
                  <TableBody>
                    {dataFiltered
                      .slice(
                        table.page * table.rowsPerPage,
                        table.page * table.rowsPerPage + table.rowsPerPage
                      )
                      .map((row) => {
                        const ticket = tickets.find((item) => String(item.id) === row.id);
                        return (
                          <TicketTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onView={() => router.push(`/tickets/${row.id}`)}
                            onEdit={
                              ticket ? () => router.push(`/tickets/${ticket.id}/edit`) : undefined
                            }
                            onDelete={
                              ticket ? () => handleOpenDelete(ticket) : undefined
                            }
                          />
                        );
                      })}

                    <TableEmptyRows
                      height={68}
                      emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                    />

                    {notFound && <TableNoData searchQuery={filterName} />}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            <TablePagination
              component="div"
              page={table.page}
              count={dataFiltered.length}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
              rowsPerPageOptions={[5, 10, 25]}
              onRowsPerPageChange={table.onChangeRowsPerPage}
            />
          </>
        )}
      </Card>

      <TicketDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={deletingTicket?.ticketNumber}
        submitting={submitting}
      />

      <TicketFilters
        canReset={canReset}
        filters={filters}
        openFilter={openFilter}
        categories={categories}
        technicians={technicians}
        departments={departments}
        locations={locations}
        onCloseFilter={() => setOpenFilter(false)}
        onResetFilter={() => {
          setFilters(defaultFilters);
          table.onResetPage();
        }}
        onSetFilters={handleSetFilters}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('ticketNumber');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, newSelecteds: string[]) => {
    if (checked) {
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  }, []);

  const onSelectRow = useCallback(
    (inputValue: string) => {
      const newSelected = selected.includes(inputValue)
        ? selected.filter((value) => value !== inputValue)
        : [...selected, inputValue];

      setSelected(newSelected);
    },
    [selected]
  );

  const onResetPage = useCallback(() => {
    setPage(0);
  }, []);

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      onResetPage();
    },
    [onResetPage]
  );

  return {
    page,
    order,
    onSort,
    orderBy,
    selected,
    rowsPerPage,
    onSelectRow,
    onResetPage,
    onChangePage,
    onSelectAllRows,
    onChangeRowsPerPage,
  };
}
