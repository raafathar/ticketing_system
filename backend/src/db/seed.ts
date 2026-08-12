import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

import { db } from './index.js';
import {
  departments,
  locations,
  slaPolicies,
  ticketCategories,
  tickets,
  users,
} from './schema.js';

const categoryTree: Record<string, string[]> = {
  Hardware: ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Keyboard', 'Mouse', 'Network Device'],
  Software: ['Operating System', 'Microsoft Office', 'Browser', 'Antivirus', 'Internal Application'],
  Network: ['Internet', 'WiFi', 'LAN', 'VPN', 'DNS'],
  'Account & Access': ['Password Reset', 'Account Creation', 'Account Lock', 'Application Access', 'Email Access'],
  'IT Service Request': ['Software Installation', 'Hardware Request', 'New Employee Setup', 'Access Request', 'Email Setup'],
  Security: ['Suspicious Email', 'Malware', 'Phishing', 'Unauthorized Access'],
};

const slaDefaults: { priority: string; response: number; resolution: number }[] = [
  { priority: 'CRITICAL', response: 15, resolution: 4 * 60 },
  { priority: 'HIGH', response: 30, resolution: 8 * 60 },
  { priority: 'MEDIUM', response: 2 * 60, resolution: 2 * 24 * 60 },
  { priority: 'LOW', response: 4 * 60, resolution: 5 * 24 * 60 },
];

async function main() {
  console.log('Seeding database...');

  await db.execute(sql`TRUNCATE TABLE ticket_attachments, ticket_comments, ticket_activity_logs, notifications, audit_logs, tickets, ticket_categories, sla_policies, users, departments, locations RESTART IDENTITY CASCADE`);

  const deptRows = await db
    .insert(departments)
    .values([
      { name: 'Human Resources' },
      { name: 'Finance' },
      { name: 'Marketing' },
      { name: 'Operations' },
      { name: 'IT' },
    ])
    .returning();
  const deptMap = Object.fromEntries(deptRows.map((d) => [d.name, d.id]));

  const locationRows = await db
    .insert(locations)
    .values([
      { name: 'Head Office - Jakarta' },
      { name: 'Branch - Bandung' },
      { name: 'Branch - Surabaya' },
      { name: 'Warehouse - Bekasi' },
    ])
    .returning();
  const locMap = Object.fromEntries(locationRows.map((l) => [l.name, l.id]));

  const passwordHash = await bcrypt.hash('password123', 10);
  const userRows = await db
    .insert(users)
    .values([
      {
        name: 'Admin Utama',
        email: 'admin@company.com',
        passwordHash,
        role: 'ADMIN',
        departmentId: deptMap['IT'],
        locationId: locMap['Head Office - Jakarta'],
      },
      {
        name: 'Budi Santoso',
        email: 'budi@company.com',
        passwordHash,
        role: 'TECHNICIAN',
        departmentId: deptMap['IT'],
        locationId: locMap['Head Office - Jakarta'],
      },
      {
        name: 'Siti Rahayu',
        email: 'siti@company.com',
        passwordHash,
        role: 'TECHNICIAN',
        departmentId: deptMap['IT'],
        locationId: locMap['Branch - Bandung'],
      },
      {
        name: 'Andi Wijaya',
        email: 'andi@company.com',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: deptMap['HR'],
        locationId: locMap['Head Office - Jakarta'],
      },
      {
        name: 'Dewi Lestari',
        email: 'dewi@company.com',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: deptMap['Finance'],
        locationId: locMap['Head Office - Jakarta'],
      },
      {
        name: 'Rina Kusuma',
        email: 'rina@company.com',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: deptMap['Marketing'],
        locationId: locMap['Branch - Surabaya'],
      },
    ])
    .returning();
  const userMap = Object.fromEntries(userRows.map((u) => [u.email, u]));

  for (const [parent, children] of Object.entries(categoryTree)) {
    const [p] = await db
      .insert(ticketCategories)
      .values({ name: parent })
      .returning();
    await db.insert(
      ticketCategories
    ).values(children.map((c) => ({ name: c, parentId: p.id })));
  }

  await db.insert(slaPolicies).values(
    slaDefaults.map((s) => ({
      priority: s.priority,
      responseMinutes: s.response,
      resolutionMinutes: s.resolution,
    }))
  );

  const catRows = await db.select().from(ticketCategories);
  const laptop = catRows.find((c) => c.name === 'Laptop');
  const email = catRows.find((c) => c.name === 'Email Access');
  const wifi = catRows.find((c) => c.name === 'WiFi');
  const office = catRows.find((c) => c.name === 'Microsoft Office');

  const sampleTickets = [
    {
      ticketNumber: 'IT-2026-000001',
      title: 'Laptop tidak bisa menyala',
      description: 'Laptop tiba-tiba mati dan tidak bisa dinyalakan kembali setelah charger dicolokkan.',
      categoryId: laptop?.id,
      priority: 'HIGH',
      status: 'RESOLVED',
      requesterId: userMap['andi@company.com'].id,
      assigneeId: userMap['budi@company.com'].id,
      departmentId: deptMap['HR'],
      locationId: locMap['Head Office - Jakarta'],
      firstResponseAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      resolvedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      closedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      resolutionNotes: 'Baterai sudah diganti, laptop berfungsi normal kembali.',
      createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
    {
      ticketNumber: 'IT-2026-000002',
      title: 'Tidak bisa akses email',
      description: 'Login email selalu gagal dengan pesan password salah, padahal password sudah benar.',
      categoryId: email?.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      requesterId: userMap['dewi@company.com'].id,
      assigneeId: userMap['siti@company.com'].id,
      departmentId: deptMap['Finance'],
      locationId: locMap['Head Office - Jakarta'],
      firstResponseAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 - 3600 * 1000),
      updatedAt: new Date(Date.now() - 3600 * 1000),
    },
    {
      ticketNumber: 'IT-2026-000003',
      title: 'WiFi kantor sangat lambat',
      description: 'Koneksi WiFi di lantai 3 sangat lambat, video conference sering terputus.',
      categoryId: wifi?.id,
      priority: 'MEDIUM',
      status: 'PENDING',
      requesterId: userMap['rina@company.com'].id,
      departmentId: deptMap['Marketing'],
      locationId: locMap['Branch - Surabaya'],
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 12 * 3600 * 1000),
    },
    {
      ticketNumber: 'IT-2026-000004',
      title: 'Instalasi Microsoft Office',
      description: 'Mohon instal Microsoft Office untuk laptop baru di divisi HR.',
      categoryId: office?.id,
      priority: 'LOW',
      status: 'NEW',
      requesterId: userMap['andi@company.com'].id,
      departmentId: deptMap['HR'],
      locationId: locMap['Head Office - Jakarta'],
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
    {
      ticketNumber: 'IT-2026-000005',
      title: 'Printer tidak terdeteksi',
      description: 'Printer HR tidak terdeteksi oleh jaringan setelah perpindahan ruangan.',
      categoryId: catRows.find((c) => c.name === 'Printer')?.id,
      priority: 'MEDIUM',
      status: 'OPEN',
      requesterId: userMap['dewi@company.com'].id,
      departmentId: deptMap['Finance'],
      locationId: locMap['Head Office - Jakarta'],
      createdAt: new Date(Date.now() - 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 20 * 3600 * 1000),
    },
  ];

  const slaByPriority: Record<string, { response: number; resolution: number }> = Object.fromEntries(
    slaDefaults.map((s) => [s.priority, { response: s.response, resolution: s.resolution }])
  );

  for (const t of sampleTickets) {
    const sla = slaByPriority[t.priority];
    const created = new Date(t.createdAt);
    await db.insert(tickets).values({
      ...t,
      slaResponseDueAt: new Date(created.getTime() + sla.response * 60 * 1000),
      slaDueAt: new Date(created.getTime() + sla.resolution * 60 * 1000),
      dueDate: new Date(created.getTime() + sla.resolution * 60 * 1000),
    });
  }

  console.log('Seed selesai.');
  console.log('Akun login:');
  console.log('  Admin     : admin@company.com / password123');
  console.log('  Technician: budi@company.com / password123');
  console.log('  Employee  : andi@company.com / password123');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed gagal:', err);
  process.exit(1);
});
