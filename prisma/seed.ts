import { PrismaClient, Role, TicketStatus, ReservationStatus, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding...");

  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.event.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  console.log("Cleared existing data.");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      role: Role.Admin,
    },
  });

  const organizerUser = await prisma.user.create({
    data: {
      name: "Organizer User",
      email: "organizer@example.com",
      password: hashedPassword,
      role: Role.Organizer,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      name: "Customer User",
      email: "customer@example.com",
      password: hashedPassword,
      role: Role.Customer,
    },
  });
  console.log("Created users.");

  const event1 = await prisma.event.create({
    data: {
      title: "Tech Conference 2025",
      description: "A global conference on the latest in technology.",
      date: new Date("2025-10-26T09:00:00Z"),
      organizerId: organizerUser.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: "Music Festival - Summer Jam",
      description: "An electrifying summer music festival.",
      date: new Date("2025-07-15T18:00:00Z"),
      organizerId: organizerUser.id,
    },
  });
  console.log("Created events.");

  const ticket1_event1 = await prisma.ticket.create({
    data: {
      eventId: event1.id,
      price: 99.99,
      status: TicketStatus.Available,
    },
  });

  const ticket2_event1 = await prisma.ticket.create({
    data: {
      eventId: event1.id,
      price: 149.99,
      status: TicketStatus.Available,
    },
  });
  console.log("Created tickets for Event 1.");

  // First update the ticket to be reserved
  await prisma.ticket.update({
    where: { id: ticket1_event1.id },
    data: {
      status: 'Booked'
    }
  });

  const reservation1 = await prisma.reservation.create({
    data: {
      user: {
        connect: { id: customerUser.id }
      },
      tickets: {
        connect: { id: ticket1_event1.id }
      },
      status: ReservationStatus.Confirmed,
    },
  });
  console.log("Created reservation.");

  await prisma.payment.create({
    data: {
      reservationId: reservation1.id,
      amount: ticket1_event1.price,
      status: PaymentStatus.Completed,
    },
  });
  console.log("Created payment.");

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
