import argon2 from 'argon2';
import { prisma } from './client.js';

const DEMO_PASSWORD = 'InnFlow2025!';

const TENANTS = [
  {
    name: 'Harbor Grand Hotel',
    slug: 'harbor-grand',
    timezone: 'America/Los_Angeles',
    address: '1200 Harbor Blvd, San Diego, CA 92101',
  },
  {
    name: 'Sierra Vista Lodge',
    slug: 'sierra-vista',
    timezone: 'America/Denver',
    address: '450 Mountain View Rd, Aspen, CO 81611',
  },
  {
    name: 'MetroStay Downtown',
    slug: 'metrostay-downtown',
    timezone: 'America/New_York',
    address: '88 Liberty St, New York, NY 10005',
  },
] as const;

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'Lucas', 'Mia', 'Oliver', 'Charlotte', 'Elijah', 'Amelia',
  'James', 'Harper', 'Benjamin', 'Evelyn', 'Henry',
];

const LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson',
];

const ROOM_TYPES = ['STANDARD', 'DELUXE', 'SUITE', 'PENTHOUSE'] as const;
const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'] as const;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(15, 0, 0, 0);
  return d;
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function seedTenant(
  tenantDef: (typeof TENANTS)[number],
  passwordHash: string,
  roomCount: number,
) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantDef.slug },
    update: { name: tenantDef.name, timezone: tenantDef.timezone },
    create: {
      name: tenantDef.name,
      slug: tenantDef.slug,
      timezone: tenantDef.timezone,
    },
  });

  const roles = ['TENANT_ADMIN', 'OPERATOR', 'VIEWER'] as const;
  const roleEmails: Record<(typeof roles)[number], string> = {
    TENANT_ADMIN: `admin@${tenantDef.slug}.innflow.local`,
    OPERATOR: `operator@${tenantDef.slug}.innflow.local`,
    VIEWER: `viewer@${tenantDef.slug}.innflow.local`,
  };
  for (const role of roles) {
    const email = roleEmails[role];
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: { passwordHash, role },
      create: { tenantId: tenant.id, email, passwordHash, role },
    });
  }

  const hotel = await prisma.hotel.upsert({
    where: { tenantId: tenant.id },
    update: { name: tenantDef.name, address: tenantDef.address },
    create: { tenantId: tenant.id, name: tenantDef.name, address: tenantDef.address },
  });

  await prisma.pmsUser.upsert({
    where: { hotelId_username: { hotelId: hotel.id, username: 'staff' } },
    update: { passwordHash, role: 'STAFF' },
    create: { hotelId: hotel.id, username: 'staff', passwordHash, role: 'STAFF' },
  });

  await prisma.failureConfiguration.upsert({
    where: { hotelId: hotel.id },
    update: { configJson: {} },
    create: { hotelId: hotel.id, configJson: {} },
  });

  const rooms = [];
  for (let i = 1; i <= roomCount; i++) {
    const floor = Math.ceil(i / 10);
    const roomNumber = `${floor}${String(i % 10 || 10).padStart(2, '0')}`;
    const room = await prisma.room.upsert({
      where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber } },
      update: {},
      create: {
        hotelId: hotel.id,
        roomNumber,
        floor,
        roomType: randomItem(ROOM_TYPES),
        status: randomItem(ROOM_STATUSES),
      },
    });
    rooms.push(room);
  }

  const guests = [];
  for (let i = 0; i < 18; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[i % LAST_NAMES.length]!;
    const guest = await prisma.guest.create({
      data: {
        hotelId: hotel.id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `+1-555-${String(1000 + i).slice(-4)}`,
      },
    });
    guests.push(guest);
  }

  for (let i = 0; i < 18; i++) {
    const guest = guests[i % guests.length]!;
    const room = rooms[i % rooms.length]!;
    const checkInOffset = -3 + (i % 10);
    const checkIn = daysFromNow(checkInOffset);
    const checkOut = daysFromNow(checkInOffset + 2 + (i % 4));
    const code = `${tenantDef.slug.toUpperCase().slice(0, 3)}-${String(10000 + i)}`;

    await prisma.reservation.upsert({
      where: { hotelId_confirmationCode: { hotelId: hotel.id, confirmationCode: code } },
      update: {},
      create: {
        hotelId: hotel.id,
        guestId: guest.id,
        roomId: room.id,
        confirmationCode: code,
        checkIn,
        checkOut,
        guestCount: 1 + (i % 3),
        status: i % 5 === 0 ? 'CHECKED_IN' : 'CONFIRMED',
        contactPref: i % 2 === 0 ? 'EMAIL' : 'SMS',
      },
    });
  }

  return tenant;
}

async function main() {
  console.log('Seeding InnFlow database...');
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const systemAdminEmail = 'admin@innflow.local';
  const existingAdmin = await prisma.user.findFirst({
    where: { email: systemAdminEmail, tenantId: null },
  });
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { passwordHash, role: 'SYSTEM_ADMIN' },
    });
  } else {
    await prisma.user.create({
      data: { tenantId: null, email: systemAdminEmail, passwordHash, role: 'SYSTEM_ADMIN' },
    });
  }

  for (const tenantDef of TENANTS) {
    const tenant = await seedTenant(tenantDef, passwordHash, 22);
    console.log(`  Seeded tenant: ${tenant.name} (${tenant.slug})`);
  }

  console.log('\nSeed complete.');
  console.log(`Demo password for all users: ${DEMO_PASSWORD}`);
  console.log('System admin: admin@innflow.local');
  console.log('Tenant users: {admin|operator|viewer}@{slug}.innflow.local');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
