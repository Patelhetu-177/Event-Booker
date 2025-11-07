import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }
        if (session.user.id !== id) {
            return NextResponse.json(
                { message: "Forbidden" },
                { status: 403 }
            );
        }

        const userId = id;

        const totalReservations = await prisma.reservation.count({
            where: {
                userId,
                status: 'Confirmed'
            },
        });

        // First, get all unique event IDs the user has tickets for
        const reservations = await prisma.reservation.findMany({
            where: {
                userId,
                status: 'Confirmed'
            },
            include: {
                tickets: {
                    select: {
                        eventId: true
                    }
                }
            }
        });
        
        // Count unique events
        const uniqueEventIds = new Set();
        reservations.forEach(reservation => {
            reservation.tickets.forEach(ticket => {
                uniqueEventIds.add(ticket.eventId);
            });
        });
        
        const eventsAttended = uniqueEventIds.size;

        return NextResponse.json({
            totalReservations,
            eventsAttended
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
