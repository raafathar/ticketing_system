import type { TicketCategory } from 'src/api/categories';
import type { ParentCategory } from 'src/api/parent-categories';

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
import { categoriesApi } from 'src/api/categories';
import { DashboardContent } from 'src/layouts/dashboard';
import { parentCategoriesApi } from 'src/api/parent-categories';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { CategoryTableRow } from '../category-table-row';
import { CategoryFormModal } from '../category-form-modal';
import { CategoryTableHead } from '../category-table-head';
import { CategoryDeleteModal } from '../category-delete-modal';
import { CategoryTableToolbar } from '../category-table-toolbar';
import { defaultFilters, CategoryFilters } from '../category-filters';
import {
  emptyRows,
  applyFilter,
  withinStatus,
  getComparator,
  categoryToRow,
  withinCreatedAt,
} from '../utils';

import type { CategoryProps } from '../category-table-row';
import type { CategoryFilters as CategoryFiltersType } from '../category-filters';

// ----------------------------------------------------------------------

export function CategoryView() {
  const table = useTable();

  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<CategoryFiltersType>(defaultFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<TicketCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [list, parentList] = await Promise.all([
        categoriesApi.list(),
        parentCategoriesApi.list(),
      ]);
      setCategories(list);
      setParentCategories(parentList);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const parentNames = Object.fromEntries(parentCategories.map((item) => [item.id, item.name]));

  const dataFiltered: CategoryProps[] = applyFilter({
    inputData: categories
      .filter((item) => withinCreatedAt(item.createdAt, filters.created))
      .filter((item) => withinStatus(item.isActive, filters.status))
      .filter((item) => filters.parent === '' || item.parentId === filters.parent)
      .map((item) => categoryToRow(item, parentNames)),
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  const canReset =
    filters.created !== defaultFilters.created ||
    filters.status !== defaultFilters.status ||
    filters.parent !== defaultFilters.parent;

  const handleSetFilters = useCallback((updateState: Partial<CategoryFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingCategory(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((category: TicketCategory) => {
    setEditingCategory(category);
    setFormOpen(true);
  }, []);

  const handleFormSaved = useCallback(() => {
    setFormOpen(false);
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenDelete = useCallback((category: TicketCategory) => {
    setDeletingCategory(category);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingCategory) return;
    setSubmitting(true);
    try {
      await categoriesApi.remove(deletingCategory.id);
      setDeleteOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete category.');
    } finally {
      setSubmitting(false);
    }
  }, [deletingCategory, fetchCategories]);

  const handleDeleteSelected = useCallback(async () => {
    if (!table.selected.length) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await Promise.all(table.selected.map((id) => categoriesApi.remove(Number(id))));
      table.onSelectAllRows(false, []);
      table.onResetPage();
      fetchCategories();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete selected categories.');
    } finally {
      setSubmitting(false);
    }
  }, [table, fetchCategories]);

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
          Ticket Categories
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
          >
            New category
          </Button>
        )}
      </Box>

      <Card>
        <CategoryTableToolbar
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
                  <CategoryTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(
                        checked,
                        dataFiltered.map((category) => category.id)
                      )
                    }
                    headLabel={[
                      { id: 'name', label: 'Name' },
                      { id: 'parent', label: 'Parent' },
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
                        const category = categories.find((item) => String(item.id) === row.id);
                        return (
                          <CategoryTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onEdit={
                              isAdmin && category ? () => handleOpenEdit(category) : undefined
                            }
                            onDelete={
                              isAdmin && category ? () => handleOpenDelete(category) : undefined
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

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
        category={editingCategory}
        parentCategories={parentCategories}
        onParentCreated={(parent) => setParentCategories((prev) => [...prev, parent])}
      />

      <CategoryDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={deletingCategory?.name}
        submitting={submitting}
      />

      <CategoryFilters
        canReset={canReset}
        filters={filters}
        openFilter={openFilter}
        parents={parentCategories}
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
