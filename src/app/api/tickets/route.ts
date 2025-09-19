import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NotFoundError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { Role, TicketStatus } from "@prisma/client";

const ticketItemSchema = z.object({
  price: z.number().positive("Price must be a positive number"),
  count: z.number().int().positive("Count must be a positive integer"),
});

const createTicketSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  // Backward compatibility: allow single price/count
  price: z.number().positive("Price must be a positive number").optional(),
  count: z.number().int().positive("Count must be a positive integer").default(1).optional(),
  // New multi-tier bulk input
  tickets: z.array(ticketItemSchema).optional(),
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
    const { eventId, price, count, tickets } = createTicketSchema.parse(body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    if (userRole !== Role.Admin && event.organizerId !== userId) {
      throw new ForbiddenError("You are not authorized to create tickets for this event");
    }

    // Prepare bulk tickets data
    let items: Array<{ price: number; count: number }> = [];
    if (tickets && tickets.length > 0) {
      items = tickets;
    } else if (typeof price === "number") {
      items = [{ price, count: count ?? 1 }];
    } else {
      throw new Error("Either provide 'tickets' array or 'price' (with optional 'count')");
    }

    // Enforce server-side max quantity
    const totalCount = items.reduce((sum, it) => sum + it.count, 0);
    const MAX_TICKETS_PER_REQUEST = 500;
    if (totalCount > MAX_TICKETS_PER_REQUEST) {
      throw new ForbiddenError(`Cannot create more than ${MAX_TICKETS_PER_REQUEST} tickets in a single request`);
    }

    // Build rows for createMany
    const data = items.flatMap((it) =>
      Array.from({ length: it.count }, () => ({
        eventId,
        price: it.price,
        status: TicketStatus.Available,
      }))
    );

    const result = await prisma.ticket.createMany({ data });

    return successResponse({ created: result.count }, "Tickets created successfully", 201);
  } catch (error) {
    return errorResponse(error);
  }
}

