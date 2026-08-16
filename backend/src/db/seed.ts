import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

import { db } from './index.js';
import {
  auditLogs,
  departments,
  locations,
  notifications,
  parentCategories,
  slaPolicies,
  ticketActivityLogs,
  ticketCategories,
  ticketComments,
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

const issues: { category: string; title: string; description: string }[] = [
  { category: 'Laptop', title: 'Laptop hang saat startup', description: 'Laptop sering hang di layar login dan perlu di-restart berkali-kali sampai normal kembali.' },
  { category: 'Laptop', title: 'Keyboard spasi tidak berfungsi', description: 'Tombol spasi terasa macet dan kadang tidak merespons saat mengetik dokumen penting.' },
  { category: 'Laptop', title: 'Baterai cepat habis', description: 'Baterai laptop hanya bertahan kurang dari satu jam meskipun sudah di-charge penuh.' },
  { category: 'Desktop', title: 'Komputer tidak mau boot', description: 'Unit desktop menampilkan layar hitam dengan kursor saat dinyalakan, perlu beberapa kali coba.' },
  { category: 'Desktop', title: 'Komputer berbunyi beep terus', description: 'Muncul bunyi beep berulang saat startup dan tidak masuk ke sistem operasi.' },
  { category: 'Monitor', title: 'Monitor berkedip-kedip', description: 'Layar monitor berkedip secara acak, diduga kabel atau panel rusak.' },
  { category: 'Monitor', title: 'Monitor tampilan buram', description: 'Resolusi tampilan tidak bisa diatur maksimal, teks terlihat tidak tajam.' },
  { category: 'Printer', title: 'Printer tidak mencetak', description: 'Antrian cetak tersendat dan printer menampilkan error paper jam meskipun kertas sudah dibereskan.' },
  { category: 'Printer', title: 'Hasil cetak bergaris', description: 'Hasil cetakan selalu bergaris horizontal, kemungkinan head printer kotor.' },
  { category: 'Keyboard', title: 'Keyboard tidak terdeteksi', description: 'Keyboard USB tidak terdeteksi setelah update driver sistem terakhir.' },
  { category: 'Mouse', title: 'Cursor melompat-lompat', description: 'Kursor mouse bergerak tidak stabil, sensor diduga kotor atau matras tidak rata.' },
  { category: 'Network Device', title: 'Switch ruang server mati', description: 'Koneksi LAN beberapa divisi terputus, indikator switch di ruang server tidak menyala.' },
  { category: 'Operating System', title: 'Blue screen (BSOD) berulang', description: 'Komputer sering blue screen dengan kode error MEMORY_MANAGEMENT saat membuka aplikasi berat.' },
  { category: 'Operating System', title: 'Update Windows gagal', description: 'Proses update Windows menampilkan error 0x80070020 dan tidak pernah selesai.' },
  { category: 'Microsoft Office', title: 'Excel error "Not Responding"', description: 'File Excel berukuran besar sering membeku dan tidak merespons saat digunakan.' },
  { category: 'Microsoft Office', title: 'Outlook tidak sinkron', description: 'Email di Outlook tidak terkirim dan kotak masuk tidak sinkron sejak kemarin.' },
  { category: 'Browser', title: 'Browser sangat lambat', description: 'Halaman web lama dimuat meskipun koneksi internet terlihat stabil.' },
  { category: 'Antivirus', title: 'Antivirus memblokir aplikasi internal', description: 'Antivirus menganggap aplikasi internal sebagai ancaman dan memblokirnya.' },
  { category: 'Internal Application', title: 'Aplikasi HR login gagal', description: 'Tidak bisa login ke aplikasi HR, muncul pesan server timeout di layar.' },
  { category: 'Internal Application', title: 'Laporan tidak bisa di-export', description: 'Tombol export laporan pada aplikasi internal tidak merespons.' },
  { category: 'Internet', title: 'Internet kantor terputus', description: 'Seluruh akses internet di kantor terputus sejak pagi, modem perlu diperiksa.' },
  { category: 'WiFi', title: 'WiFi sering terputus', description: 'Sinyal WiFi di ruang meeting sering hilang saat rapat penting berlangsung.' },
  { category: 'LAN', title: 'IP conflict pada workstation', description: 'Beberapa komputer mendapat peringatan duplicate IP address pada jaringan lokal.' },
  { category: 'VPN', title: 'VPN tidak bisa terhubung', description: 'Gagal terkoneksi ke VPN korporat saat bekerja dari rumah.' },
  { category: 'DNS', title: 'DNS tidak resolve internal', description: 'Domain internal tidak dapat diakses pada sebagian komputer meskipun internet normal.' },
  { category: 'Password Reset', title: 'Reset password akun', description: 'Memenuhi reset password karena lupa kata sandi setelah libur panjang.' },
  { category: 'Account Creation', title: 'Buat akun karyawan baru', description: 'Mohon dibuatkan akun email dan login untuk karyawan baru yang mulai bekerja Senin.' },
  { category: 'Account Lock', title: 'Akun terkunci', description: 'Akun terkunci setelah beberapa kali salah memasukkan password hari ini.' },
  { category: 'Application Access', title: 'Tambahkan akses modul SMA', description: 'Mohon diberikan akses ke modul SMA untuk tim keuangan.' },
  { category: 'Email Access', title: 'Tidak bisa akses email', description: 'Login email gagal dengan pesan password tidak valid di browser maupun aplikasi.' },
  { category: 'Software Installation', title: 'Instalasi aplikasi desain', description: 'Mohon diinstalkan aplikasi editing untuk kebutuhan pembuatan konten.' },
  { category: 'Hardware Request', title: 'Permintaan monitor tambahan', description: 'Membutuhkan monitor kedua untuk mendukung pekerjaan multi-tasking.' },
  { category: 'New Employee Setup', title: 'Setup laptop karyawan baru', description: 'Persiapan laptop, email, dan akses internal untuk karyawan baru divisi kami.' },
  { category: 'Access Request', title: 'Akses folder bersama', description: 'Mohon diberikan akses ke shared folder divisi untuk kebutuhan kolaborasi.' },
  { category: 'Email Setup', title: 'Setup email di Outlook', description: 'Perlu bantuan konfigurasi akun email di aplikasi Outlook desktop.' },
  { category: 'Suspicious Email', title: 'Email mencurigakan', description: 'Menerima email yang mengatasnamakan direktur dan meminta informasi rekening.' },
  { category: 'Malware', title: 'Komputer terinfeksi malware', description: 'Muncul pop-up mencurigakan dan performa komputer menurun drastis.' },
  { category: 'Phishing', title: 'Terkait link phishing', description: 'Tidak sengaja mengklik link mencurigakan pada email, mohon diperiksa keamanannya.' },
  { category: 'Unauthorized Access', title: 'Login mencurigakan terdeteksi', description: 'Menerima notifikasi login dari lokasi yang tidak dikenal pada akun saya.' },
];

const resolutionNotes = [
  'Sudah diperbaiki dan dites kembali, perangkat berfungsi normal.',
  'Komponen diganti, seluruh fungsi sudah diverifikasi.',
  'Konfigurasi diperbarui dan masalah tidak muncul lagi.',
  'Koneksi distabilkan, pengguna diminta memantau.',
  'Akses sudah diberikan sesuai dengan permintaan.',
];

const statusPool: string[] = [
  ...Array(16).fill('RESOLVED'),
  ...Array(8).fill('CLOSED'),
  ...Array(9).fill('IN_PROGRESS'),
  ...Array(7).fill('OPEN'),
  ...Array(5).fill('PENDING'),
  ...Array(5).fill('NEW'),
];

const priorityPool = ['HIGH', 'MEDIUM', 'LOW', 'CRITICAL', 'MEDIUM', 'HIGH'];

const NUM_TICKETS = 50;

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

async function main() {
  console.log('Seeding database...');

  await db.execute(sql`TRUNCATE TABLE ticket_attachments, ticket_comments, ticket_activity_logs, notifications, audit_logs, tickets, ticket_categories, parent_categories, sla_policies, users, departments, locations RESTART IDENTITY CASCADE`);

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

  const userDefs: { name: string; email: string; role: string; dept: string; loc: string }[] = [
    { name: 'Admin Utama', email: 'admin@company.com', role: 'ADMIN', dept: 'IT', loc: 'Head Office - Jakarta' },
    { name: 'Budi Santoso', email: 'budi@company.com', role: 'TECHNICIAN', dept: 'IT', loc: 'Head Office - Jakarta' },
    { name: 'Siti Rahayu', email: 'siti@company.com', role: 'TECHNICIAN', dept: 'IT', loc: 'Branch - Bandung' },
    { name: 'Agus Pratama', email: 'agus@company.com', role: 'TECHNICIAN', dept: 'IT', loc: 'Branch - Surabaya' },
    { name: 'Maya Anggraini', email: 'maya@company.com', role: 'TECHNICIAN', dept: 'IT', loc: 'Warehouse - Bekasi' },
    { name: 'Andi Wijaya', email: 'andi@company.com', role: 'EMPLOYEE', dept: 'Human Resources', loc: 'Head Office - Jakarta' },
    { name: 'Dewi Lestari', email: 'dewi@company.com', role: 'EMPLOYEE', dept: 'Finance', loc: 'Head Office - Jakarta' },
    { name: 'Rina Kusuma', email: 'rina@company.com', role: 'EMPLOYEE', dept: 'Marketing', loc: 'Branch - Surabaya' },
    { name: 'Joko Susilo', email: 'joko@company.com', role: 'EMPLOYEE', dept: 'Operations', loc: 'Branch - Bandung' },
    { name: 'Putri Handayani', email: 'putri@company.com', role: 'EMPLOYEE', dept: 'Finance', loc: 'Branch - Bandung' },
    { name: 'Bagus Setiawan', email: 'bagus@company.com', role: 'EMPLOYEE', dept: 'Operations', loc: 'Warehouse - Bekasi' },
    { name: 'Lina Marlina', email: 'lina@company.com', role: 'EMPLOYEE', dept: 'Human Resources', loc: 'Branch - Surabaya' },
    { name: 'Hendra Gunawan', email: 'hendra@company.com', role: 'EMPLOYEE', dept: 'IT', loc: 'Warehouse - Bekasi' },
  ];

  const userRows = await db
    .insert(users)
    .values(
      userDefs.map((u) => ({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        departmentId: deptMap[u.dept],
        locationId: locMap[u.loc],
      }))
    )
    .returning();
  const userMap = Object.fromEntries(userRows.map((u) => [u.email, u]));

  const parentRows = await db
    .insert(parentCategories)
    .values(Object.keys(categoryTree).map((name) => ({ name })))
    .returning();
  const parentMap = Object.fromEntries(parentRows.map((p) => [p.name, p.id]));

  for (const [parent, children] of Object.entries(categoryTree)) {
    await db.insert(
      ticketCategories
    ).values(children.map((c) => ({ name: c, parentId: parentMap[parent] })));
  }

  await db.insert(slaPolicies).values(
    slaDefaults.map((s) => ({
      priority: s.priority,
      responseMinutes: s.response,
      resolutionMinutes: s.resolution,
    }))
  );

  const catRows = await db.select().from(ticketCategories);
  const catMap = new Map(catRows.map((c) => [c.name, c.id]));

  const employeePool: { email: string; dept: string; loc: string }[] = [
    { email: 'andi@company.com', dept: 'Human Resources', loc: 'Head Office - Jakarta' },
    { email: 'dewi@company.com', dept: 'Finance', loc: 'Head Office - Jakarta' },
    { email: 'rina@company.com', dept: 'Marketing', loc: 'Branch - Surabaya' },
    { email: 'joko@company.com', dept: 'Operations', loc: 'Branch - Bandung' },
    { email: 'putri@company.com', dept: 'Finance', loc: 'Branch - Bandung' },
    { email: 'bagus@company.com', dept: 'Operations', loc: 'Warehouse - Bekasi' },
    { email: 'lina@company.com', dept: 'Human Resources', loc: 'Branch - Surabaya' },
    { email: 'hendra@company.com', dept: 'IT', loc: 'Warehouse - Bekasi' },
  ];

  const techPool = ['budi@company.com', 'siti@company.com', 'agus@company.com', 'maya@company.com'];

  const slaByPriority: Record<string, { response: number; resolution: number }> = Object.fromEntries(
    slaDefaults.map((s) => [s.priority, { response: s.response, resolution: s.resolution }])
  );

  const now = Date.now();

  type TicketValue = {
    ticketNumber: string;
    title: string;
    description: string;
    categoryId: number | null;
    priority: string;
    status: string;
    requesterId: number;
    assigneeId: number | null;
    departmentId: number;
    locationId: number;
    slaResponseDueAt: Date;
    slaDueAt: Date;
    dueDate: Date;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
    resolutionNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  const ticketValues: TicketValue[] = [];

  for (let i = 0; i < NUM_TICKETS; i += 1) {
    const issue = issues[i % issues.length];
    const status = statusPool[(i * 13) % statusPool.length];
    const priority = priorityPool[(i * 7) % priorityPool.length];
    const emp = employeePool[i % employeePool.length];
    const isNew = status === 'NEW';
    const assigneeEmail = isNew ? null : techPool[(i * 3) % techPool.length];

    let daysAgo = (i * 5) % 14;
    let hoursOffset = (i * 7) % 9;
    let resolveDays = (i * 3) % 4;

    if (i % 6 === 4 && (status === 'RESOLVED' || status === 'CLOSED')) {
      daysAgo = 0;
      hoursOffset = 1;
      resolveDays = 0;
    }

    const createdAt = new Date(now - daysAgo * DAY - hoursOffset * HOUR);

    const isResolvedState = status === 'RESOLVED' || status === 'CLOSED';
    const resolvedAt = isResolvedState ? new Date(createdAt.getTime() + resolveDays * DAY + 3 * HOUR) : null;
    const closedAt = status === 'CLOSED' && isNew === false ? (resolvedAt ? new Date(resolvedAt.getTime() + DAY) : null) : null;
    const firstResponseAt = isNew ? null : new Date(createdAt.getTime() + ((i % 3) + 1) * HOUR);
    const updatedAt = isResolvedState ? (resolvedAt ?? createdAt) : new Date(now - (i % 5) * HOUR);

    const sla = slaByPriority[priority];
    ticketValues.push({
      ticketNumber: `IT-2026-${String(i + 1).padStart(6, '0')}`,
      title: issue.title,
      description: issue.description,
      categoryId: catMap.get(issue.category) ?? null,
      priority,
      status,
      requesterId: userMap[emp.email].id,
      assigneeId: assigneeEmail ? userMap[assigneeEmail].id : null,
      departmentId: deptMap[emp.dept],
      locationId: locMap[emp.loc],
      slaResponseDueAt: new Date(createdAt.getTime() + sla.response * 60 * 1000),
      slaDueAt: new Date(createdAt.getTime() + sla.resolution * 60 * 1000),
      dueDate: new Date(createdAt.getTime() + sla.resolution * 60 * 1000),
      firstResponseAt,
      resolvedAt,
      closedAt,
      resolutionNotes: isResolvedState ? resolutionNotes[i % resolutionNotes.length] : null,
      createdAt,
      updatedAt,
    });
  }

  const ticketRows = await db.insert(tickets).values(ticketValues).returning();

  const activityValues: {
    ticketId: number;
    userId: number | null;
    action: string;
    oldValue: string | null;
    newValue: string | null;
    description: string | null;
    createdAt: Date;
  }[] = [];

  ticketRows.forEach((t, i) => {
    activityValues.push({
      ticketId: t.id,
      userId: t.requesterId,
      action: 'TICKET_CREATED',
      oldValue: null,
      newValue: t.status,
      description: `Tiket ${t.ticketNumber} dibuat`,
      createdAt: t.createdAt,
    });

    if (t.assigneeId) {
      activityValues.push({
        ticketId: t.id,
        userId: t.assigneeId,
        action: 'ASSIGNED',
        oldValue: null,
        newValue: 'Assigned',
        description: `Tiket ${t.ticketNumber} ditugaskan`,
        createdAt: new Date(t.createdAt.getTime() + HOUR),
      });
    }

    if (t.status === 'IN_PROGRESS') {
      activityValues.push({
        ticketId: t.id,
        userId: t.assigneeId ?? t.requesterId,
        action: 'STATUS_CHANGED',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
        description: `Status tiket ${t.ticketNumber} menjadi In Progress`,
        createdAt: t.updatedAt,
      });
    }

    if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
      activityValues.push({
        ticketId: t.id,
        userId: t.assigneeId ?? t.requesterId,
        action: 'STATUS_CHANGED',
        oldValue: 'IN_PROGRESS',
        newValue: t.status,
        description: `Status tiket ${t.ticketNumber} menjadi ${t.status}`,
        createdAt: t.resolvedAt ?? t.updatedAt,
      });

      if (i % 2 === 0) {
        activityValues.push({
          ticketId: t.id,
          userId: t.assigneeId ?? t.requesterId,
          action: 'RESOLVED',
          oldValue: null,
          newValue: null,
          description: `Tiket ${t.ticketNumber} diselesaikan`,
          createdAt: t.resolvedAt ?? t.updatedAt,
        });
      }
    }
  });

  await db.insert(ticketActivityLogs).values(activityValues);

  const commentValues: { ticketId: number; userId: number; comment: string; isInternal: boolean }[] = [];

  ticketRows.forEach((t, i) => {
    if ((t.status === 'RESOLVED' || t.status === 'IN_PROGRESS') && i % 3 === 0 && t.assigneeId) {
      commentValues.push({
        ticketId: t.id,
        userId: t.assigneeId,
        comment: t.status === 'RESOLVED' ? 'Perbaikan selesai dilakukan, mohon konfirmasinya.' : 'Sedang ditangani, akan saya kabari perkembangannya.',
        isInternal: false,
      });
    }
  });

  await db.insert(ticketComments).values(commentValues);

  const notificationValues: {
    userId: number;
    type: string;
    title: string;
    message: string;
    ticketId: number;
  }[] = [];

  ticketRows.forEach((t, i) => {
    if (i % 4 === 0) {
      notificationValues.push({
        userId: t.requesterId,
        type: 'TICKET_CREATED',
        title: 'Tiket Baru',
        message: `Tiket ${t.ticketNumber}: ${t.title}`,
        ticketId: t.id,
      });
    }
    if (t.assigneeId && i % 6 === 1) {
      notificationValues.push({
        userId: t.assigneeId,
        type: 'ASSIGNED',
        title: 'Tiket Ditugaskan',
        message: `Tiket ${t.ticketNumber}: ${t.title} ditugaskan kepada Anda`,
        ticketId: t.id,
      });
    }
  });

  await db.insert(notifications).values(notificationValues);

  const auditValues: {
    userId: number | null;
    action: string;
    entity: string;
    entityId: number;
    oldValue: string | null;
    newValue: string | null;
  }[] = [];

  ticketRows.forEach((t, i) => {
    if (i % 5 === 0) {
      auditValues.push({
        userId: t.requesterId,
        action: 'CREATE',
        entity: 'ticket',
        entityId: t.id,
        oldValue: null,
        newValue: `${t.ticketNumber}: ${t.title}`,
      });
    }
    if (i % 4 === 0) {
      auditValues.push({
        userId: t.assigneeId ?? t.requesterId,
        action: 'ASSIGN',
        entity: 'ticket',
        entityId: t.id,
        oldValue: 'Unassigned',
        newValue: t.assigneeId ? 'Assigned' : 'Unassigned',
      });
    }
  });

  await db.insert(auditLogs).values(auditValues);

  console.log('Seed selesai.');
  console.log(`Total tiket dibuat: ${ticketRows.length}`);
  console.log('Akun login (password123):');
  console.log('  Admin     : admin@company.com');
  console.log('  Technician: budi@company.com | siti@company.com | agus@company.com | maya@company.com');
  console.log('  Employee  : andi@company.com | dewi@company.com | rina@company.com | joko@company.com');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed gagal:', err);
  process.exit(1);
});