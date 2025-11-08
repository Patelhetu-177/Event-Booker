import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { verifyAccessToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      const authHeader = request.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { message: 'No authentication token provided' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      const payload = await verifyAccessToken(token);

      if (!payload) {
        return NextResponse.json(
          { message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      if (payload.userId !== id) {
        return NextResponse.json(
          { message: 'Forbidden' },
          { status: 403 }
        );
      }
    }
    else if (session.user?.id !== id) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    const [totalReservations, reservations] = await Promise.all([
      prisma.reservation.count({
        where: {
          userId: id,
          status: 'Confirmed'
        },
      }),
      prisma.reservation.findMany({
        where: {
          userId: id,
          status: 'Confirmed'
        },
        include: {
          tickets: {
            select: {
              eventId: true
            }
          }
        }
      })
    ]);

    const eventsAttended = new Set(
      reservations.flatMap((reservation: { tickets: { eventId: string }[] }) =>
        reservation.tickets.map(ticket => ticket.eventId)
      )
    ).size;

    return NextResponse.json({
      totalReservations,
      eventsAttended
    });

  } catch (error) {
    console.error('Error in user stats API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
