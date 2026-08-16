import type { Ticket } from 'src/api/tickets';
import type { IconifyName } from 'src/components/iconify/register-icons';

import { useParams } from 'react-router';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Timeline from '@mui/lab/Timeline';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TimelineDot from '@mui/lab/TimelineDot';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import InputLabel from '@mui/material/InputLabel';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import CircularProgress from '@mui/material/CircularProgress';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { useAuth } from 'src/auth';
import { usersApi } from 'src/api/users';
import { ticketsApi } from 'src/api/tickets';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import {
  slaColor,
  slaLabel,
  statusColor,
  statusLabel,
  STATUS_LABELS,
  priorityColor,
  priorityLabel,
  formatDuration,
  formatFileSize,
} from '../utils';

// ----------------------------------------------------------------------

export function TicketDetailView() {
  const router = useRouter();
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [technicians, setTechnicians] = useState<{ id: number; name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [detail, userList] = await Promise.all([
        ticketsApi.get(Number(id)),
        usersApi.list(),
      ]);
      setTicket(detail);
      setTechnicians(
        userList
          .filter((user) => user.role !== 'EMPLOYEE')
          .map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role }))
      );
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleChangeStatus = useCallback(
    async (status: string) => {
      if (!ticket) return;
      setStatusSubmitting(true);
      setErrorMsg('');
      try {
        const updated = await ticketsApi.changeStatus(ticket.id, { status });
        setTicket(updated);
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to change status.');
      } finally {
        setStatusSubmitting(false);
      }
    },
    [ticket]
  );

  const handleAssign = useCallback(
    async (assigneeId: number) => {
      if (!ticket) return;
      setAssignSubmitting(true);
      setErrorMsg('');
      try {
        const updated = await ticketsApi.assign(ticket.id, { assigneeId });
        setTicket(updated);
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Failed to assign ticket.');
      } finally {
        setAssignSubmitting(false);
      }
    },
    [ticket]
  );

  const handleAddComment = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!ticket) return;
      setCommentError('');
      setCommentSubmitting(true);
      try {
        const updated = await ticketsApi.addComment(ticket.id, { comment: newComment.trim() });
        setTicket(updated);
        setNewComment('');
      } catch (error) {
        setCommentError(error instanceof Error ? error.message : 'Failed to add comment.');
      } finally {
        setCommentSubmitting(false);
      }
    },
    [ticket, newComment]
  );

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ py: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!ticket) {
    return (
      <DashboardContent>
        <Alert severity="error">{errorMsg || 'Ticket not found.'}</Alert>
      </DashboardContent>
    );
  }

  const canManage =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'TECHNICIAN' ||
    ticket.requesterId === currentUser?.id;

  const renderHeader = (
    <Box sx={{ mb: 4 }}>
      <Button
        color="inherit"
        startIcon={<Iconify icon="solar:alt-arrow-left-outline" />}
        onClick={() => router.push('/tickets')}
        sx={{ mb: 2 }}
      >
        Back to tickets
      </Button>

      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
        <Typography variant="h4" sx={{ flexGrow: 1, minWidth: 280 }}>
          {ticket.ticketNumber}
        </Typography>

        <Label color={statusColor(ticket.status)}>{statusLabel(ticket.status)}</Label>
        <Label color={priorityColor(ticket.priority)}>{priorityLabel(ticket.priority)}</Label>
        <Label color={slaColor(ticket.slaStatus)}>{slaLabel(ticket.slaStatus)}</Label>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Iconify icon="solar:pen-bold" />}
          onClick={() => router.push(`/tickets/${ticket.id}/edit`)}
        >
          Edit
        </Button>
      </Stack>

      <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
        {ticket.title}
      </Typography>
    </Box>
  );

  const renderActions = (
    <Card>
      <CardHeader title="Actions" />
      <CardContent>
        <Stack spacing={2.5}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={ticket.status}
              disabled={!canManage || statusSubmitting}
              onChange={(event) => handleChangeStatus(event.target.value)}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Assign to</InputLabel>
            <Select
              label="Assign to"
              value={ticket.assigneeId ?? ''}
              disabled={!canManage || assignSubmitting}
              onChange={(event) => handleAssign(Number(event.target.value))}
            >
              <MenuItem value="">
                <Typography color="text.disabled">Unassigned</Typography>
              </MenuItem>
              {technicians.map((tech) => (
                <MenuItem key={tech.id} value={tech.id}>
                  {tech.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderRequestInfo = (
    <Card>
      <CardHeader title="Request information" />
      <CardContent>
        <Stack spacing={2}>
          <InfoRow
            icon="solar:user-circle-bold"
            label="Requester"
            value={ticket.requester?.name ?? '-'}
          />
          <InfoRow
            icon="solar:buildings-2-bold"
            label="Department"
            value={ticket.department?.name ?? '-'}
          />
          <InfoRow
            icon="solar:map-point-bold"
            label="Location"
            value={ticket.location?.name ?? '-'}
          />
          <InfoRow icon="solar:mail-bold" label="Contact" value={ticket.requester?.email ?? '-'} />
        </Stack>
      </CardContent>
    </Card>
  );

  const renderTicketInfo = (
    <Card>
      <CardHeader title="Ticket information" />
      <CardContent>
        <Stack spacing={2}>
          <InfoRow
            icon="solar:widget-bold"
            label="Category"
            value={ticket.category?.name ?? '-'}
          />
          <InfoRow
            icon="solar:user-circle-bold"
            label="Assigned technician"
            value={ticket.assignee?.name ?? '-'}
          />
          <InfoRow
            icon="solar:calendar-bold"
            label="Created at"
            value={fDateTime(ticket.createdAt)}
          />
          <InfoRow
            icon="solar:calendar-bold"
            label="Updated at"
            value={fDateTime(ticket.updatedAt)}
          />
          <InfoRow
            icon="solar:calendar-bold"
            label="Due date"
            value={ticket.dueDate ? fDateTime(ticket.dueDate) : '-'}
          />
          <InfoRow
            icon="solar:calendar-bold"
            label="Resolved at"
            value={ticket.resolvedAt ? fDateTime(ticket.resolvedAt) : '-'}
          />
        </Stack>
      </CardContent>
    </Card>
  );

  const renderSlaInfo = (
    <Card>
      <CardHeader title="SLA" />
      <CardContent>
        <Stack spacing={2}>
          <InfoRow
            icon="solar:shield-keyhole-bold-duotone"
            label="SLA status"
            value={slaLabel(ticket.slaStatus)}
          />
          <InfoRow
            icon="solar:clock-circle-bold"
            label="Response due"
            value={ticket.slaResponseDueAt ? fDateTime(ticket.slaResponseDueAt) : '-'}
          />
          <InfoRow
            icon="solar:clock-circle-bold"
            label="Resolution due"
            value={ticket.slaDueAt ? fDateTime(ticket.slaDueAt) : '-'}
          />
          <InfoRow
            icon="solar:clock-circle-bold"
            label="First response time"
            value={formatDuration(ticket.responseTimeSeconds)}
          />
          <InfoRow
            icon="solar:clock-circle-bold"
            label="Resolution time"
            value={formatDuration(ticket.resolutionTimeSeconds)}
          />
        </Stack>
      </CardContent>
    </Card>
  );

  const renderDescription = (
    <Card>
      <CardHeader title="Description" />
      <CardContent>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </Typography>
        {ticket.resolutionNotes && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Resolution notes
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {ticket.resolutionNotes}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderTimeline = (
    <Card>
      <CardHeader title="Activity timeline" />
      <Timeline
        sx={{ m: 0, p: 3, [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 } }}
      >
        {ticket.activityLogs.length === 0 && (
          <Typography variant="body2" sx={{ px: 3, pb: 3, color: 'text.secondary' }}>
            No activity recorded yet.
          </Typography>
        )}
        {ticket.activityLogs.map((log, index) => (
          <TimelineItem key={log.id}>
            <TimelineSeparator>
              <TimelineDot color="primary" />
              {index === ticket.activityLogs.length - 1 ? null : <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Typography variant="subtitle2">{log.description}</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {log.user?.name ?? 'System'} · {fDateTime(log.createdAt)}
              </Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Card>
  );

  const renderComments = (
    <Card>
      <CardHeader title="Comments" />
      <CardContent>
        {ticket.comments.length === 0 && (
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            No comments yet.
          </Typography>
        )}

        <Stack spacing={2} sx={{ mb: 3 }}>
          {ticket.comments.map((comment) => (
            <Box
              key={comment.id}
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: 'background.neutral',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2">{comment.user?.name ?? 'Unknown'}</Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  · {fDateTime(comment.createdAt)}
                </Typography>
                {comment.isInternal && (
                  <Label color="warning" variant="soft">
                    Internal
                  </Label>
                )}
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {comment.comment}
              </Typography>
            </Box>
          ))}
        </Stack>

        {!!commentError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {commentError}
          </Alert>
        )}

        {canManage && (
          <Box component="form" onSubmit={handleAddComment}>
            <Stack direction="row" alignItems="flex-start" spacing={1.5}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                color="inherit"
                disabled={commentSubmitting || !newComment.trim()}
                sx={{ flexShrink: 0 }}
              >
                {commentSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Send'}
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderAttachments = ticket.attachments.length ? (
    <Card>
      <CardHeader title="Attachments" />
      <CardContent>
        <Stack spacing={1.5}>
          {ticket.attachments.map((attachment) => (
            <Stack key={attachment.id} direction="row" alignItems="center" spacing={1.5}>
              <Iconify icon="solar:file-bold" sx={{ color: 'text.disabled' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {attachment.originalFilename}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {formatFileSize(attachment.fileSize)} · {attachment.user?.name ?? 'Unknown'} ·{' '}
                  {fDateTime(attachment.createdAt)}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  ) : null;

  return (
    <DashboardContent>
      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {renderHeader}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {renderDescription}
            {renderComments}
            {renderAttachments}
            {renderTimeline}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {renderActions}
            {renderRequestInfo}
            {renderTicketInfo}
            {renderSlaInfo}
          </Stack>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type InfoRowProps = {
  icon: IconifyName;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
      <Iconify icon={icon} width={20} sx={{ color: 'text.disabled', mt: 0.2 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body2" noWrap>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}
