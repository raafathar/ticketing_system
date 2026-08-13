import type { Location } from 'src/api/locations';

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

import { useAuth } from 'src/auth';
import { locationsApi } from 'src/api/locations';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { LocationTableRow } from '../location-table-row';
import { LocationFormModal } from '../location-form-modal';
import { LocationTableHead } from '../location-table-head';
import { LocationDeleteModal } from '../location-delete-modal';
import { LocationTableToolbar } from '../location-table-toolbar';
import { defaultFilters, LocationFilters } from '../location-filters';
import { emptyRows, applyFilter, locationToRow, getComparator, withinCreatedAt } from '../utils';

import type { LocationProps } from '../location-table-row';
import type { LocationFilters as LocationFiltersType } from '../location-filters';

// ----------------------------------------------------------------------

export function LocationView() {
  const table = useTable();

  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<LocationFiltersType>(defaultFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await locationsApi.list();
      setLocations(list);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const dataFiltered: LocationProps[] = applyFilter({
    inputData: locations
      .filter((item) => withinCreatedAt(item.createdAt, filters.created))
      .map(locationToRow),
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  const canReset = filters.created !== defaultFilters.created;

  const handleSetFilters = useCallback((updateState: Partial<LocationFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingLocation(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((location: Location) => {
    setEditingLocation(location);
    setFormOpen(true);
  }, []);

  const handleFormSaved = useCallback(() => {
    setFormOpen(false);
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenDelete = useCallback((location: Location) => {
    setDeletingLocation(location);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingLocation) return;
    setSubmitting(true);
    try {
      await locationsApi.remove(deletingLocation.id);
      setDeleteOpen(false);
      setDeletingLocation(null);
      fetchLocations();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete location.');
    } finally {
      setSubmitting(false);
    }
  }, [deletingLocation, fetchLocations]);

  const handleDeleteSelected = useCallback(async () => {
    if (!table.selected.length) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await Promise.all(table.selected.map((id) => locationsApi.remove(Number(id))));
      table.onSelectAllRows(false, []);
      table.onResetPage();
      fetchLocations();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete selected locations.');
    } finally {
      setSubmitting(false);
    }
  }, [table, fetchLocations]);

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
          Locations
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
          >
            New location
          </Button>
        )}
      </Box>

      <Card>
        <LocationTableToolbar
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
                <Table sx={{ minWidth: 800 }}>
                  <LocationTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(
                        checked,
                        dataFiltered.map((location) => location.id)
                      )
                    }
                    headLabel={[
                      { id: 'name', label: 'Name' },
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
                        const location = locations.find((item) => String(item.id) === row.id);
                        return (
                          <LocationTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onEdit={
                              isAdmin && location ? () => handleOpenEdit(location) : undefined
                            }
                            onDelete={
                              isAdmin && location ? () => handleOpenDelete(location) : undefined
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

      <LocationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
        location={editingLocation}
      />

      <LocationDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={deletingLocation?.name}
        submitting={submitting}
      />

      <LocationFilters
        canReset={canReset}
        filters={filters}
        openFilter={openFilter}
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
  const [orderBy, setOrderBy] = useState('name');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

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
