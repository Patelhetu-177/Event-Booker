import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  console.log('[/api/admin/reports] Starting request processing');
  try {
    const userRole = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");
    
    console.log(`[/api/admin/reports] User ID: ${userId}, Role: ${userRole}`);
    
    if (!userRole || !userId) {
      console.error('[/api/admin/reports] Missing required headers - userRole:', userRole, 'userId:', userId);
      throw new UnauthorizedError("Authentication required");
    }

    if (userRole !== Role.Admin) {
      console.error('[/api/admin/reports] Forbidden - User is not an admin');
      throw new ForbiddenError("Admin access required");
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[/api/admin/reports] Database connection successful');
    } catch (dbError) {
      console.error('[/api/admin/reports] Database connection error:', dbError);
      throw new Error('Database connection error');
    }

    let totalUsers, totalEvents, totalReservations, totalTickets;
    
    try {
      [totalUsers, totalEvents, totalReservations, totalTickets] = await Promise.all([
        prisma.user.count().catch(e => { console.error('Error counting users:', e); return 0; }),
        prisma.event.count().catch(e => { console.error('Error counting events:', e); return 0; }),
        prisma.reservation.count().catch(e => { console.error('Error counting reservations:', e); return 0; }),
        prisma.ticket.count().catch(e => { console.error('Error counting tickets:', e); return 0; }),
      ]);
      console.log('[/api/admin/reports] Counts - Users:', totalUsers, 'Events:', totalEvents, 'Reservations:', totalReservations, 'Tickets:', totalTickets);
    } catch (countError) {
      console.error('[/api/admin/reports] Error getting counts:', countError);
      // Set default values if counts fail
      totalUsers = totalEvents = totalReservations = totalTickets = 0;
    }

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
      include: {
        user: {
          select: { name: true }
        },
        tickets: {
          include: {
            Event: {
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
      ...(recentUsers || []).filter(user => user).map(user => ({
        id: `user-${user.id}`,
        type: "user_registered" as const,
        description: `New user registered: ${user.name || 'A user'} (${user.email || 'no email'})`,
        timestamp: user.createdAt?.toISOString() || new Date().toISOString(),
      })),
      ...(recentEvents || []).filter(event => event).map(event => ({
        id: `event-${event.id}`,
        type: "event_created" as const,
        description: `New event created: ${event.title || 'Untitled Event'} by ${event.organizer?.name || 'an organizer'}`,
        timestamp: event.createdAt?.toISOString() || new Date().toISOString(),
      })),
      ...(recentReservations || []).filter(reservation => reservation).map(reservation => ({
        id: `reservation-${reservation.id}`,
        type: "reservation_made" as const,
        description: `${reservation.user?.name || 'A user'} made a reservation for ${reservation.tickets?.[0]?.Event?.title || 'an event'}`,
        timestamp: reservation.createdAt?.toISOString() || new Date().toISOString(),
      })),
      ...(recentPayments || []).filter(payment => payment).map(payment => ({
        id: `payment-${payment.id}`,
        type: "payment_completed" as const,
        description: `Payment completed: $${payment.amount?.toFixed(2) || '0.00'} by ${payment.reservation?.user?.name || 'a user'}`,
        timestamp: payment.createdAt?.toISOString() || new Date().toISOString(),
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

    // Ensure we have valid numbers
    const safeTotalUsers = typeof totalUsers === 'number' ? totalUsers : 0;
    const safeTotalEvents = typeof totalEvents === 'number' ? totalEvents : 0;
    const safeTotalReservations = typeof totalReservations === 'number' ? totalReservations : 0;
    const safeTotalTickets = typeof totalTickets === 'number' ? totalTickets : 0;
    const safeTotalRevenue = typeof totalRevenue === 'number' ? Number(totalRevenue) : 0;
    
    const reportData = {
      totalUsers: safeTotalUsers,
      totalEvents: safeTotalEvents,
      totalReservations: safeTotalReservations,
      totalTickets: safeTotalTickets,
      totalRevenue: safeTotalRevenue,
      recentActivity: Array.isArray(recentActivity) ? recentActivity : [],
      usersByRole: Array.isArray(usersByRole) 
        ? usersByRole.map(item => ({
            role: item?.role || 'UNKNOWN',
            count: item?._count?.role || 0
          }))
        : [],
      eventsByMonth: Array.isArray(eventsByMonth) ? eventsByMonth.length : 0
    };

    return successResponse(reportData, "Reports retrieved successfully");
  } catch (error) {
    console.error('[/api/admin/reports] Error:', error);
    if (process.env.NODE_ENV === 'production') {
      // Don't expose internal errors in production
      return errorResponse(new Error('An error occurred while generating the report'));
    }
    return errorResponse(error);
  } finally {
    console.log('[/api/admin/reports] Request completed');
  }
}
