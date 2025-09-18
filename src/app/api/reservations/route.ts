import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, NotFoundError, UnauthorizedError, ConflictError } from "@/lib/errors";
import { Role, TicketStatus, ReservationStatus } from "@prisma/client";

const createReservationSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
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
          ticket: { include: { event: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (userRole === Role.Admin || userRole === Role.Organizer) {
      reservations = await prisma.reservation.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          ticket: { include: { event: true } },
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

    if (!userId || !userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (userRole !== Role.Customer) {
      throw new ForbiddenError("Only Customers can create reservations");
    }

    const body = await req.json();
    const { ticketId } = createReservationSchema.parse(body);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    if (ticket.status !== TicketStatus.Available) {
      throw new ConflictError("Ticket is not available for reservation");
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId, status: TicketStatus.Available },
        data: { status: TicketStatus.Booked },
      });

      if (!updatedTicket) {
        throw new ConflictError("Ticket is no longer available");
      }

      return tx.reservation.create({
        data: {
          userId,
          ticketId,
          status: ReservationStatus.Confirmed,
        },
      });
    });

    return successResponse(reservation, "Reservation created successfully", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
