import { sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { tickets } from '../db/schema.js';

const year = () => new Date().getFullYear();

const pad6 = (n: number) => String(n).padStart(6, '0');

export const generateTicketNumber = async (): Promise<string> => {
  const prefix = `IT-${year()}`;
  const rows = await db.execute(
    sql`SELECT ticket_number FROM tickets WHERE ticket_number LIKE ${prefix + '-'} || '%' ORDER BY id DESC LIMIT 1`
  );
  const last = rows.rows[0]?.ticket_number as string | undefined;
  const seq = last ? Number(last.split('-').pop()) + 1 : 1;
  return `${prefix}-${pad6(seq)}`;
};

export const formatTicketNumber = (ticket: { id: number }) =>
  `IT-${year()}-${pad6(ticket.id)}`;
