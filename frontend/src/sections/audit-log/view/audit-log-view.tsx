import type { AuditLog } from 'src/api/audit-logs';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { auditLogsApi } from 'src/api/audit-logs';
import { DashboardContent } from 'src/layouts/dashboard';

import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { applyFilter, auditLogToRow } from '../utils';
import { AuditLogTableRow } from '../audit-log-table-row';
import { AuditLogTableHead } from '../audit-log-table-head';
import { AuditLogDetailModal } from '../audit-log-detail-modal';
import { AuditLogTableToolbar } from '../audit-log-table-toolbar';
import { defaultFilters, AuditLogFilters } from '../audit-log-filters';

import type { AuditLogRowProps } from '../audit-log-table-row';
import type { AuditLogFilters as AuditLogFiltersType } from '../audit-log-filters';

// ----------------------------------------------------------------------

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterName, setFilterName] = useState('');

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<AuditLogFiltersType>(defaultFilters);

  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await auditLogsApi.list({ page, pageSize });
      setLogs(response.items);
      setTotal(response.pagination.total);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const dataFiltered: AuditLogRowProps[] = applyFilter(
    logs
      .filter((log) => filters.action === 'ALL' || log.action === filters.action)
      .filter((log) => filters.entity === 'ALL' || log.entity === filters.entity)
      .map(auditLogToRow),
    filterName
  );

  const notFound = !dataFiltered.length && !!filterName;

  const canReset =
    filters.action !== defaultFilters.action || filters.entity !== defaultFilters.entity;

  const handleSetFilters = useCallback((updateState: Partial<AuditLogFiltersType>) => {
    setFilters((prevValue) => ({ ...prevValue, ...updateState }));
  }, []);

  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage + 1);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(1);
  }, []);

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">Audit Logs</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {total} activity records
        </Typography>
      </Box>

      <Card>
        <AuditLogTableToolbar
          filterName={filterName}
          canReset={canReset}
          onOpenFilter={() => setOpenFilter(true)}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
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
                <Table sx={{ minWidth: 640 }}>
                  <AuditLogTableHead
                    headLabel={[
                      { id: 'user', label: 'User' },
                      { id: 'action', label: 'Action' },
                      { id: 'entity', label: 'Entity' },
                      { id: 'createdAt', label: 'Timestamp' },
                    ]}
                  />
                  <TableBody>
                    {dataFiltered.map((row) => {
                      const log = logs.find((item) => String(item.id) === row.id);
                      return (
                        <AuditLogTableRow
                          key={row.id}
                          row={row}
                          onView={log ? () => setDetailLog(log) : undefined}
                        />
                      );
                    })}

                    {notFound && <TableNoData searchQuery={filterName} />}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            <TablePagination
              component="div"
              page={page - 1}
              count={total}
              rowsPerPage={pageSize}
              onPageChange={handleChangePage}
              rowsPerPageOptions={[10, 20, 50]}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Card>

      <AuditLogFilters
        canReset={canReset}
        filters={filters}
        openFilter={openFilter}
        onCloseFilter={() => setOpenFilter(false)}
        onResetFilter={() => setFilters(defaultFilters)}
        onSetFilters={handleSetFilters}
      />

      <AuditLogDetailModal
        open={!!detailLog}
        log={detailLog}
        onClose={() => setDetailLog(null)}
      />
    </DashboardContent>
  );
}
