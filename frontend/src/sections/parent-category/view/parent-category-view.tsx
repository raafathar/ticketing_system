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
import { DashboardContent } from 'src/layouts/dashboard';
import { parentCategoriesApi } from 'src/api/parent-categories';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { ParentCategoryTableRow } from '../parent-category-table-row';
import { ParentCategoryFormModal } from '../parent-category-form-modal';
import { ParentCategoryTableHead } from '../parent-category-table-head';
import { ParentCategoryDeleteModal } from '../parent-category-delete-modal';
import { ParentCategoryTableToolbar } from '../parent-category-table-toolbar';
import { defaultFilters, ParentCategoryFilters } from '../parent-category-filters';
import {
  emptyRows,
  applyFilter,
  withinStatus,
  getComparator,
  withinCreatedAt,
  parentCategoryToRow,
} from '../utils';

import type { ParentCategoryProps } from '../parent-category-table-row';
import type { ParentCategoryFilters as ParentCategoryFiltersType } from '../parent-category-filters';

// ----------------------------------------------------------------------

export function ParentCategoryView() {
  const table = useTable();

  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<ParentCategoryFiltersType>(defaultFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingParentCategory, setEditingParentCategory] = useState<ParentCategory | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingParentCategory, setDeletingParentCategory] = useState<ParentCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchParentCategories = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await parentCategoriesApi.list();
      setParentCategories(list);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load parent categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParentCategories();
  }, [fetchParentCategories]);

  const dataFiltered: ParentCategoryProps[] = applyFilter({
    inputData: parentCategories
      .filter((item) => withinCreatedAt(item.createdAt, filters.created))
      .filter((item) => withinStatus(item.isActive, filters.status))
      .map(parentCategoryToRow),
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  const canReset =
    filters.created !== defaultFilters.created || filters.status !== defaultFilters.status;

  const handleSetFilters = useCallback((updateState: Partial<ParentCategoryFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingParentCategory(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((parentCategory: ParentCategory) => {
    setEditingParentCategory(parentCategory);
    setFormOpen(true);
  }, []);

  const handleFormSaved = useCallback(() => {
    setFormOpen(false);
    fetchParentCategories();
  }, [fetchParentCategories]);

  const handleOpenDelete = useCallback((parentCategory: ParentCategory) => {
    setDeletingParentCategory(parentCategory);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingParentCategory) return;
    setSubmitting(true);
    try {
      await parentCategoriesApi.remove(deletingParentCategory.id);
      setDeleteOpen(false);
      setDeletingParentCategory(null);
      fetchParentCategories();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete parent category.');
    } finally {
      setSubmitting(false);
    }
  }, [deletingParentCategory, fetchParentCategories]);

  const handleDeleteSelected = useCallback(async () => {
    if (!table.selected.length) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await Promise.all(table.selected.map((id) => parentCategoriesApi.remove(Number(id))));
      table.onSelectAllRows(false, []);
      table.onResetPage();
      fetchParentCategories();
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Failed to delete selected parent categories.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [table, fetchParentCategories]);

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
          Parent Categories
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
          >
            New parent category
          </Button>
        )}
      </Box>

      <Card>
        <ParentCategoryTableToolbar
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
                  <ParentCategoryTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(
                        checked,
                        dataFiltered.map((parentCategory) => parentCategory.id)
                      )
                    }
                    headLabel={[
                      { id: 'name', label: 'Name' },
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
                        const parentCategory = parentCategories.find(
                          (item) => String(item.id) === row.id
                        );
                        return (
                          <ParentCategoryTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onEdit={
                              isAdmin && parentCategory
                                ? () => handleOpenEdit(parentCategory)
                                : undefined
                            }
                            onDelete={
                              isAdmin && parentCategory
                                ? () => handleOpenDelete(parentCategory)
                                : undefined
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

      <ParentCategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
        parentCategory={editingParentCategory}
      />

      <ParentCategoryDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={deletingParentCategory?.name}
        submitting={submitting}
      />

      <ParentCategoryFilters
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
