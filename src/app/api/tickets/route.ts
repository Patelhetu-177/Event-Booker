import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NotFoundError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { Role, TicketStatus } from "@prisma/client";

const createTicketSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  price: z.number().positive("Price must be a positive number"),
});

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      include: { event: { select: { id: true, title: true, date: true } } },
      orderBy: { createdAt: "asc" },
    });
    return successResponse(tickets, "Tickets retrieved successfully");
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

    if (userRole !== Role.Admin && userRole !== Role.Organizer) {
      throw new ForbiddenError("Only Admins or Organizers can create tickets");
    }

    const body = await req.json();
    const { eventId, price } = createTicketSchema.parse(body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    if (userRole !== Role.Admin && event.organizerId !== userId) {
      throw new ForbiddenError("You are not authorized to create tickets for this event");
    }

    const ticket = await prisma.ticket.create({
      data: {
        eventId,
        price,
        status: TicketStatus.Available,
      },
    });

    return successResponse(ticket, "Ticket created successfully", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
