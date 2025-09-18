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
        event: whereClause
      }
    });

    const totalReservations = await prisma.reservation.count({
      where: {
        ticket: {
          event: whereClause
        }
      }
    });

    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: "Completed",
        reservation: {
          ticket: {
            event: whereClause
          }
        }
      },
      _sum: {
        amount: true
      }
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    const recentReservations = await prisma.reservation.findMany({
      take: 5,
      where: {
        ticket: {
          event: whereClause
        }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: { name: true, email: true }
        },
        ticket: {
          select: {
            event: {
              select: { title: true }
            }
          }
        }
      },
    });

    const recentPayments = await prisma.payment.findMany({
      take: 5,
      where: {
        status: "Completed",
        reservation: {
          ticket: {
            event: whereClause
          }
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
            ticket: {
              select: {
                event: {
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
        description: `${reservation.user.name} booked a ticket for ${reservation.ticket.event.title}`,
        timestamp: reservation.createdAt.toISOString(),
      })),
      ...recentPayments.map(payment => ({
        id: `payment-${payment.id}`,
        type: "payment_completed" as const,
        description: `Payment of $${payment.amount.toFixed(2)} received for ${payment.reservation.ticket.event.title}`,
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
          where: { ticket: { eventId: event.id } }
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
