import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { Role, TicketStatus } from "@prisma/client";

const updateTicketSchema = z.object({
  price: z.number().positive("Price must be a positive number").optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, title: true, date: true, organizerId: true } },
        reservations: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    return successResponse(ticket, "Ticket retrieved successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || !userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!existingTicket) {
      throw new NotFoundError("Ticket not found");
    }

    if (userRole !== Role.Admin && existingTicket.event.organizerId !== userId) {
      throw new ForbiddenError("You are not authorized to update this ticket");
    }

    const body = await req.json();
    const { price, status } = updateTicketSchema.parse(body);

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        price,
        status,
      },
    });

    return successResponse(updatedTicket, "Ticket updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || !userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!existingTicket) {
      throw new NotFoundError("Ticket not found");
    }

    if (userRole !== Role.Admin && existingTicket.event.organizerId !== userId) {
      throw new ForbiddenError("You are not authorized to delete this ticket");
    }

    await prisma.ticket.delete({ where: { id } });

    return successResponse(null, "Ticket deleted successfully", 204);
  } catch (error) {
    return errorResponse(error);
  }
}
