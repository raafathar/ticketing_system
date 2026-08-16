import type { Department } from 'src/api/departments';

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
import { departmentsApi } from 'src/api/departments';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { DepartmentTableRow } from '../department-table-row';
import { DepartmentFormModal } from '../department-form-modal';
import { DepartmentTableHead } from '../department-table-head';
import { DepartmentDeleteModal } from '../department-delete-modal';
import { DepartmentTableToolbar } from '../department-table-toolbar';
import { defaultFilters, DepartmentFilters } from '../department-filters';
import { emptyRows, applyFilter, getComparator, withinCreatedAt, departmentToRow } from '../utils';

import type { DepartmentProps } from '../department-table-row';
import type { DepartmentFilters as DepartmentFiltersType } from '../department-filters';

// ----------------------------------------------------------------------

export function DepartmentView() {
  const table = useTable();

  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<DepartmentFiltersType>(defaultFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await departmentsApi.list();
      setDepartments(list);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const dataFiltered: DepartmentProps[] = applyFilter({
    inputData: departments
      .filter((item) => withinCreatedAt(item.createdAt, filters.created))
      .map(departmentToRow),
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  const canReset = filters.created !== defaultFilters.created;

  const handleSetFilters = useCallback((updateState: Partial<DepartmentFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingDepartment(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((department: Department) => {
    setEditingDepartment(department);
    setFormOpen(true);
  }, []);

  const handleFormSaved = useCallback(() => {
    setFormOpen(false);
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenDelete = useCallback((department: Department) => {
    setDeletingDepartment(department);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingDepartment) return;
    setSubmitting(true);
    try {
      await departmentsApi.remove(deletingDepartment.id);
      setDeleteOpen(false);
      setDeletingDepartment(null);
      fetchDepartments();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete department.');
    } finally {
      setSubmitting(false);
    }
  }, [deletingDepartment, fetchDepartments]);

  const handleDeleteSelected = useCallback(async () => {
    if (!table.selected.length) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await Promise.all(table.selected.map((id) => departmentsApi.remove(Number(id))));
      table.onSelectAllRows(false, []);
      table.onResetPage();
      fetchDepartments();
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Failed to delete selected departments.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [table, fetchDepartments]);

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
          Departments
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
          >
            New department
          </Button>
        )}
      </Box>

      <Card>
        <DepartmentTableToolbar
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
                  <DepartmentTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(
                        checked,
                        dataFiltered.map((department) => department.id)
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
                        const department = departments.find((item) => String(item.id) === row.id);
                        return (
                          <DepartmentTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onEdit={
                              isAdmin && department ? () => handleOpenEdit(department) : undefined
                            }
                            onDelete={
                              isAdmin && department ? () => handleOpenDelete(department) : undefined
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

      <DepartmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
        department={editingDepartment}
      />

      <DepartmentDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={deletingDepartment?.name}
        submitting={submitting}
      />

      <DepartmentFilters
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
