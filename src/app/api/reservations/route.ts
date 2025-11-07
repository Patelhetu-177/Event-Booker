import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, NotFoundError, UnauthorizedError, ConflictError } from "@/lib/errors";
import { Role, TicketStatus, ReservationStatus } from "@prisma/client";

const createReservationSchema = z.object({
  tickets: z.array(z.object({
    ticketId: z.string().uuid("Invalid ticket ID"),
    quantity: z.number().int().positive("Quantity must be at least 1").default(1)
  })).min(1, "At least one ticket is required"),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || !userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    let reservations;

    if (userRole === Role.Customer) {
      reservations = await prisma.reservation.findMany({
        where: { userId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          tickets: { include: { Event: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (userRole === Role.Admin || userRole === Role.Organizer) {
      reservations = await prisma.reservation.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          tickets: { include: { Event: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      throw new ForbiddenError("Access denied");
    }

    return successResponse(reservations, "Reservations retrieved successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || userRole !== Role.Customer) {
      throw new UnauthorizedError("Unauthorized access");
    }

    const body = await req.json();
    const { tickets } = createReservationSchema.parse(body);

    // First, validate all tickets and quantities
    const ticketDetails = await Promise.all(
      tickets.map(async ({ ticketId, quantity }) => {
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { Event: true },
        });

        if (!ticket) {
          throw new NotFoundError(`Ticket ${ticketId} not found`);
        }

        if (ticket.status !== TicketStatus.Available) {
          throw new ConflictError(`Ticket ${ticketId} is not available`);
        }

        // Check for existing reservations for this ticket and user
        const existingReservation = await prisma.reservation.findFirst({
          where: {
            userId,
            tickets: {
              some: { id: ticketId }
            },
            status: { in: [ReservationStatus.Pending, ReservationStatus.Confirmed] },
          },
        });

        if (existingReservation) {
          throw new ConflictError(`You already have a reservation for ticket ${ticketId}`);
        }

        return { ticket, quantity };
      })
    );

    // If we get here, all validations passed
    const result = await prisma.$transaction(async (tx) => {
      const reservations = [];

      for (const { ticket, quantity } of ticketDetails) {
        // Create a single reservation for each ticket type with the specified quantity
        const reservation = await tx.reservation.create({
          data: {
            userId,
            tickets: {
              connect: Array(quantity).fill(0).map(() => ({
                id: ticket.id
              }))
            },
            status: ReservationStatus.Pending,
          },
          include: {
            tickets: { 
              include: { 
                Event: true 
              } 
            },
            user: { 
              select: { 
                id: true, 
                name: true, 
                email: true 
              } 
            },
          },
        });

        // Update all reserved tickets
        await tx.ticket.updateMany({
          where: { 
            id: { 
              in: reservation.tickets.map(t => t.id) 
            } 
          },
          data: { 
            status: TicketStatus.Booked,
            reservationId: reservation.id
          },
        });

        reservations.push(reservation);
      }

      return reservations;
    });

    return successResponse(result, "Tickets reserved successfully", 201);
  } catch (error) {
    console.error('Reservation Error:', error);
    return errorResponse(error);
  }
}
