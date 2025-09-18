import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, NotFoundError, UnauthorizedError, ConflictError } from "@/lib/errors";
import { Role, ReservationStatus, TicketStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || !userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { ticket: true },
    });

    if (!reservation) {
      throw new NotFoundError("Reservation not found");
    }

    if (userRole !== Role.Admin && reservation.userId !== userId) {
      throw new ForbiddenError("You are not authorized to cancel this reservation");
    }

    if (reservation.status === ReservationStatus.Cancelled) {
      throw new ConflictError("Reservation is already cancelled");
    }

    const cancelledReservation = await prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: { status: ReservationStatus.Cancelled },
      });

      if (reservation.ticketId) {
        await tx.ticket.update({
          where: { id: reservation.ticketId },
          data: { status: TicketStatus.Available },
        });
      }
      return updatedReservation;
    });

    return successResponse(cancelledReservation, "Reservation cancelled successfully");
  } catch (error) {
    return errorResponse(error);
  }
}
