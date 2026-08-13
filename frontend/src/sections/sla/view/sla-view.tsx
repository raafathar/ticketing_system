import type { SlaPolicy } from 'src/api/sla';

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
import { slaApi } from 'src/api/sla';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { SlaTableRow } from '../sla-table-row';
import { SlaFormModal } from '../sla-form-modal';
import { SlaTableHead } from '../sla-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { SlaDeleteModal } from '../sla-delete-modal';
import { SlaTableToolbar } from '../sla-table-toolbar';
import { SlaFilters, defaultFilters } from '../sla-filters';
import {
  slaToRow,
  emptyRows,
  applyFilter,
  withinStatus,
  getComparator,
  withinCreatedAt,
} from '../utils';

import type { SlaProps } from '../sla-table-row';
import type { SlaFilters as SlaFiltersType } from '../sla-filters';

// ----------------------------------------------------------------------

export function SlaView() {
  const table = useTable();

  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [slaList, setSlaList] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<SlaFiltersType>(defaultFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSla, setEditingSla] = useState<SlaPolicy | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingSla, setDeletingSla] = useState<SlaPolicy | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSlaList = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await slaApi.list();
      setSlaList(list);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load SLA policies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlaList();
  }, [fetchSlaList]);

  const dataFiltered: SlaProps[] = applyFilter({
    inputData: slaList
      .filter((item) => withinCreatedAt(item.createdAt, filters.created))
      .filter((item) => withinStatus(item.isActive, filters.status))
      .map(slaToRow),
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  const canReset =
    filters.created !== defaultFilters.created || filters.status !== defaultFilters.status;

  const handleSetFilters = useCallback((updateState: Partial<SlaFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingSla(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((sla: SlaPolicy) => {
    setEditingSla(sla);
    setFormOpen(true);
  }, []);

  const handleFormSaved = useCallback(() => {
    setFormOpen(false);
    fetchSlaList();
  }, [fetchSlaList]);

  const handleOpenDelete = useCallback((sla: SlaPolicy) => {
    setDeletingSla(sla);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingSla) return;
    setSubmitting(true);
    try {
      await slaApi.remove(deletingSla.id);
      setDeleteOpen(false);
      setDeletingSla(null);
      fetchSlaList();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete SLA policy.');
    } finally {
      setSubmitting(false);
    }
  }, [deletingSla, fetchSlaList]);

  const handleDeleteSelected = useCallback(async () => {
    if (!table.selected.length) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await Promise.all(table.selected.map((id) => slaApi.remove(Number(id))));
      table.onSelectAllRows(false, []);
      table.onResetPage();
      fetchSlaList();
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Failed to delete selected SLA policies.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [table, fetchSlaList]);

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
          SLA Policies
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
          >
            New SLA
          </Button>
        )}
      </Box>

      <Card>
        <SlaTableToolbar
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
                  <SlaTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(
                        checked,
                        dataFiltered.map((sla) => sla.id)
                      )
                    }
                    headLabel={[
                      { id: 'priority', label: 'Priority' },
                      { id: 'response', label: 'Response' },
                      { id: 'resolution', label: 'Resolution' },
                      { id: 'status', label: 'Status' },
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
                        const sla = slaList.find((item) => String(item.id) === row.id);
                        return (
                          <SlaTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onEdit={isAdmin && sla ? () => handleOpenEdit(sla) : undefined}
                            onDelete={isAdmin && sla ? () => handleOpenDelete(sla) : undefined}
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

      <SlaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
        sla={editingSla}
      />

      <SlaDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={deletingSla?.priority}
        submitting={submitting}
      />

      <SlaFilters
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
  const [orderBy, setOrderBy] = useState('priority');
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
