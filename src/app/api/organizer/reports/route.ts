import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");

    if (!userRole || !userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (userRole !== Role.Admin && userRole !== Role.Organizer) {
      throw new ForbiddenError("Organizer or Admin access required");
    }

    const whereClause = userRole === Role.Admin ? {} : { organizerId: userId };

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        organizer: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const totalEvents = events.length;

    const totalTickets = await prisma.ticket.count({
      where: {
        Event: whereClause
      }
    });

    const eventIds = (await prisma.event.findMany({
      where: whereClause,
      select: { id: true }
    })).map(event => event.id);

    let totalReservations = 0;
    
    if (eventIds.length > 0) {
      const columnInfo = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Ticket' 
        AND column_name IN ('reservationId', 'reservation_id')
        LIMIT 1
      `;
      
      const reservationIdColumn = columnInfo[0]?.column_name || 'reservationId';
      
      const reservationsResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT ${reservationIdColumn}) as count
        FROM "public"."Ticket"
        WHERE "eventId" IN (${eventIds.join(",")})
        AND ${reservationIdColumn} IS NOT NULL
      `;
      
      totalReservations = Number(reservationsResult[0]?.count) || 0;
    }

    let totalRevenue = 0;
    
    if (eventIds.length > 0) {
      const reservationIds = (await prisma.ticket.findMany({
        where: {
          eventId: { in: eventIds },
          reservationId: { not: null }
        },
        distinct: ['reservationId'],
        select: { reservationId: true }
      })).map(t => t.reservationId);
      
      if (reservationIds.length > 0) {
        const revenueResult = await prisma.payment.aggregate({
          where: {
            status: "Completed",
            reservationId: { in: reservationIds.filter((id): id is string => id !== null) }
          },
          _sum: {
            amount: true
          }
        });
        totalRevenue = revenueResult._sum.amount || 0;
      }
    }

    const recentReservations = await prisma.reservation.findMany({
      take: 5,
      where: {
        tickets: {
          some: {
            eventId: { in: eventIds }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: { name: true, email: true }
        },
        tickets: {
          where: {
            eventId: { in: eventIds }
          },
          select: {
            Event: {
              select: { title: true }
            }
          },
          take: 1
        }
      },
    });

    const reservationIds = (await prisma.reservation.findMany({
      where: {
        tickets: {
          some: {
            eventId: { in: eventIds }
          }
        }
      },
      select: { id: true }
    })).map(r => r.id);

    const recentPayments = await prisma.payment.findMany({
      take: 5,
      where: {
        status: "Completed",
        reservation: {
          id: { in: reservationIds }
        }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        reservation: {
          select: {
            user: {
              select: { name: true }
            },
            tickets: {
              select: {
                Event: {
                  select: { title: true }
                }
              }
            }
          }
        }
      },
    });

    const recentActivity = [
      ...recentReservations.map(reservation => ({
        id: `reservation-${reservation.id}`,
        type: "reservation_made" as const,
        description: `${reservation.user.name} booked a ticket for ${reservation.tickets[0].Event.title}`,
        timestamp: reservation.createdAt.toISOString(),
      })),
      ...recentPayments.map(payment => ({
        id: `payment-${payment.id}`,
        type: "payment_completed" as const,
        description: `Payment of $${payment.amount.toFixed(2)} received for ${payment.reservation.tickets[0].Event.title}`,
        timestamp: payment.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    const eventPerformance = await Promise.all(
      events.map(async (event) => {
        const eventTickets = await prisma.ticket.count({
          where: { eventId: event.id }
        });
        const eventReservations = await prisma.reservation.count({
          where: { tickets: { some: { eventId: event.id } } }
        });

        return {
          id: event.id,
          title: event.title,
          date: event.date.toISOString(),
          totalTickets: eventTickets,
          soldTickets: eventReservations,
          revenue: 0,
          conversionRate: eventTickets > 0 ? (eventReservations / eventTickets * 100) : 0
        };
      })
    );

    const reportData = {
      totalEvents,
      totalTickets,
      totalReservations,
      totalRevenue: Number(totalRevenue),
      recentActivity,
      eventPerformance,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date.toISOString(),
        createdAt: event.createdAt.toISOString(),
        _count: {
          tickets: 0,
          reservations: 0
        },
        organizer: event.organizer
      }))
    };

    return successResponse(reportData, "Organizer reports retrieved successfully");
  } catch (error) {
    return errorResponse(error);
  }
}
