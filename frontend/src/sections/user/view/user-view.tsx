import type { AdminUser } from 'src/api/users';
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

import { useAuth } from 'src/auth';
import { usersApi } from 'src/api/users';
import { masterDataApi } from 'src/api/master-data';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { UserTableRow } from '../user-table-row';
import { UserFormModal } from '../user-form-modal';
import { UserTableHead } from '../user-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserDeleteModal } from '../user-delete-modal';
import { UserTableToolbar } from '../user-table-toolbar';
import { UserFilters, defaultFilters } from '../user-filters';
import { emptyRows, userToRow, applyFilter, getComparator } from '../utils';

import type { UserProps } from '../user-table-row';
import type { UserFilters as UserFiltersType } from '../user-filters';

// ----------------------------------------------------------------------

export function UserView() {
  const table = useTable();

  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<UserFiltersType>(defaultFilters);

  const [departments, setDepartments] = useState<MasterDataItem[]>([]);
  const [locations, setLocations] = useState<MasterDataItem[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await usersApi.list();
      setUsers(list);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasterData = useCallback(async () => {
    try {
      const [depList, locList] = await Promise.all([
        masterDataApi.departments(),
        masterDataApi.locations(),
      ]);
      setDepartments(depList);
      setLocations(locList);
    } catch {
      // Master data is optional; the form will show empty selects.
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchMasterData();
  }, [fetchUsers, fetchMasterData]);

  const dataFiltered: UserProps[] = applyFilter({
    inputData: users
      .filter((user) => {
        if (filters.role !== 'ALL' && user.role !== filters.role) return false;
        if (filters.status === 'active' && !user.isActive) return false;
        if (filters.status === 'banned' && user.isActive) return false;
        if (
          filters.departments.length &&
          (!user.departmentId || !filters.departments.includes(user.departmentId))
        ) {
          return false;
        }
        if (
          filters.locations.length &&
          (!user.locationId || !filters.locations.includes(user.locationId))
        ) {
          return false;
        }
        return true;
      })
      .map(userToRow),
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  const canReset = Object.keys(filters).some(
    (key) => filters[key as keyof UserFiltersType] !== defaultFilters[key as keyof UserFiltersType]
  );

  const handleSetFilters = useCallback((updateState: Partial<UserFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingUser(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((adminUser: AdminUser) => {
    setEditingUser(adminUser);
    setFormOpen(true);
  }, []);

  const handleFormSaved = useCallback(() => {
    setFormOpen(false);
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDelete = useCallback((adminUser: AdminUser) => {
    setDeletingUser(adminUser);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingUser) return;
    setSubmitting(true);
    try {
      await usersApi.remove(deletingUser.id);
      setDeleteOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  }, [deletingUser, fetchUsers]);

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
          Users
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
          >
            New user
          </Button>
        )}
      </Box>

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          canReset={canReset}
          onOpenFilter={() => setOpenFilter(true)}
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
                  <UserTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(
                        checked,
                        dataFiltered.map((user) => user.id)
                      )
                    }
                    headLabel={[
                      { id: 'name', label: 'Name' },
                      { id: 'company', label: 'Company' },
                      { id: 'role', label: 'Role' },
                      { id: 'isVerified', label: 'Verified', align: 'center' },
                      { id: 'status', label: 'Status' },
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
                        const adminUser = users.find((user) => String(user.id) === row.id);
                        return (
                          <UserTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onEdit={
                              isAdmin && adminUser ? () => handleOpenEdit(adminUser) : undefined
                            }
                            onDelete={
                              isAdmin && adminUser ? () => handleOpenDelete(adminUser) : undefined
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

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
        user={editingUser}
        departments={departments}
        locations={locations}
      />

      <UserDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        userName={deletingUser?.name}
        submitting={submitting}
      />

      <UserFilters
        canReset={canReset}
        filters={filters}
        openFilter={openFilter}
        onCloseFilter={() => setOpenFilter(false)}
        onResetFilter={() => {
          setFilters(defaultFilters);
          table.onResetPage();
        }}
        onSetFilters={handleSetFilters}
        departments={departments}
        locations={locations}
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
