import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import {  UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { Role } from "@prisma/client";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().datetime("Invalid date format"),
});

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        _count: {
          select: { Ticket: true }
        }
      },
      orderBy: { date: "asc" },
    });
    return successResponse(events, "Events retrieved successfully");
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
      throw new ForbiddenError("Only Admins or Organizers can create events");
    }

    const body = await req.json();
    const { title, description, date } = createEventSchema.parse(body);

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        organizerId: userId,
      },
    });

    return successResponse(event, "Event created successfully", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
