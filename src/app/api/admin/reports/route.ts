import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    
    if (!userRole) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (userRole !== Role.Admin) {
      throw new ForbiddenError("Admin access required");
    }

    const [totalUsers, totalEvents, totalReservations, totalTickets] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.reservation.count(),
      prisma.ticket.count(),
    ]);

    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: "Completed"
      },
      _sum: {
        amount: true
      }
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    const recentUsers = await prisma.user.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const recentEvents = await prisma.event.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        organizer: {
          select: { name: true }
        }
      },
    });

    const recentReservations = await prisma.reservation.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
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
      },
    });

    const recentPayments = await prisma.payment.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      where: {
        status: "Completed"
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        reservation: {
          select: {
            user: {
              select: { name: true }
            }
          }
        }
      },
    });

    const recentActivity = [
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: "user_registered" as const,
        description: `New user registered: ${user.name} (${user.email})`,
        timestamp: user.createdAt.toISOString(),
      })),
      ...recentEvents.map(event => ({
        id: `event-${event.id}`,
        type: "event_created" as const,
        description: `New event created: ${event.title} by ${event.organizer.name}`,
        timestamp: event.createdAt.toISOString(),
      })),
      ...recentReservations.map(reservation => ({
        id: `reservation-${reservation.id}`,
        type: "reservation_made" as const,
        description: `${reservation.user.name} made a reservation for ${reservation.ticket.event.title}`,
        timestamp: reservation.createdAt.toISOString(),
      })),
      ...recentPayments.map(payment => ({
        id: `payment-${payment.id}`,
        type: "payment_completed" as const,
        description: `Payment completed: $${payment.amount.toFixed(2)} by ${payment.reservation.user.name}`,
        timestamp: payment.createdAt.toISOString(),
      })),
    ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const eventsByMonth = await prisma.event.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      }
    });

    const reportData = {
      totalUsers,
      totalEvents,
      totalReservations,
      totalTickets,
      totalRevenue: Number(totalRevenue),
      recentActivity,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.role
      })),
      eventsByMonth: eventsByMonth.length
    };

    return successResponse(reportData, "Reports retrieved successfully");
  } catch (error) {
    return errorResponse(error);
  }
}
