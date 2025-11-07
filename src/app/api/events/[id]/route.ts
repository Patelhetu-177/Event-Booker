import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { Role } from "@prisma/client";

const updateEventSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  date: z.string().datetime("Invalid date format").optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { organizer: { select: { id: true, name: true, email: true } }, Ticket: true },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    return successResponse(event, "Event retrieved successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || !userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      throw new NotFoundError("Event not found");
    }

    if (userRole !== Role.Admin && existingEvent.organizerId !== userId) {
      throw new ForbiddenError("Only the event organizer or an Admin can update this event");
    }

    const body = await req.json();
    const { title, description, date } = updateEventSchema.parse(body);

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        date: date ? new Date(date) : undefined,
      },
    });

    return successResponse(updatedEvent, "Event updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || !userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      throw new NotFoundError("Event not found");
    }

    if (userRole !== Role.Admin && existingEvent.organizerId !== userId) {
      throw new ForbiddenError("Only the event organizer or an Admin can delete this event");
    }

    await prisma.event.delete({ where: { id } });

    return successResponse(null, "Event deleted successfully", 204);
  } catch (error) {
    return errorResponse(error);
  }
}
