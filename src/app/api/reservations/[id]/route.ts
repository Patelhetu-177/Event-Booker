import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-utils";
import { NextRequest } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    let userId = session?.user?.id;

    const authHeader = request.headers.get('authorization');
    if (!userId && authHeader) {
      const token = authHeader.split(' ')[1];
      const decoded = await verifyToken(token);
      userId = decoded?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { message: "You must be logged in" },
        { status: 401 }
      );
    }

    const { quantity } = await request.json().catch(() => ({} as { quantity?: number }));

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: {
          tickets: {
            include: {
              Event: true  // Changed from 'event' to 'Event'
            }
          }
        },
      });

      if (!reservation) {
        throw new Error("Reservation not found");
      }

      if (reservation.userId !== userId) {
        throw new Error("You are not authorized to cancel this reservation");
      }

      if (quantity && quantity > 0) {
        // First find the tickets to update
        const ticketsToUpdate = await tx.ticket.findMany({
          where: {
            eventId: reservation.tickets[0]?.eventId,
            status: 'Booked' as const,
            reservationId: reservation.id
          },
          take: quantity,
          select: { id: true }
        });

        await tx.ticket.updateMany({
          where: {
            id: { in: ticketsToUpdate.map(t => t.id) }
          },
          data: {
            status: 'Available' as const,
            reservationId: null
          }
        });
      } else {
        await tx.ticket.updateMany({
          where: {
            reservationId: reservation.id
          },
          data: {
            status: 'Available' as const,
            reservationId: null
          }
        });
      }

      const remainingTickets = await tx.ticket.count({
        where: { reservationId: reservation.id }
      });

      if (remainingTickets === 0) {
        const updatedReservation = await tx.reservation.update({
          where: { id },
          data: {
            status: 'Cancelled'
          },
          include: {
            tickets: {
              include: {
                Event: true
              }
            }
          }
        });

        return {
          eventId: updatedReservation.tickets[0]?.eventId
        };
      }

      return {
        eventId: reservation.tickets[0]?.eventId
      };
    });

    return NextResponse.json({
      message: "Reservation cancelled successfully",
      eventId: result.eventId
    });
  } catch (error: unknown) {
    console.error("Error cancelling reservation:", error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { message: errorMessage },
      { status: errorMessage === 'Internal server error' ? 500 : 400 }
    );
  }
}
