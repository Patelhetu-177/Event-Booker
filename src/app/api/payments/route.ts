import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NotFoundError, UnauthorizedError, ConflictError, ForbiddenError } from "@/lib/errors";
import { PaymentStatus, ReservationStatus } from "@prisma/client";

const basePaymentSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID is required"),
  amount: z.number().positive("Amount must be a positive number"),
});

const paymentSchema = basePaymentSchema.refine(
  (data) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(data.reservationId);
  },
  {
    message: "Invalid reservation ID format",
    path: ["reservationId"]
  }
);

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const body = await req.json();
    console.log('Received payment request:', { body, headers: Object.fromEntries(req.headers.entries()) });
    
    // First parse with base schema to get the data
    const baseResult = basePaymentSchema.safeParse(body);
    if (!baseResult.success) {
      console.error('Base validation error:', baseResult.error);
      return errorResponse(new Error('Invalid request data: ' + JSON.stringify(baseResult.error.issues)), 400);
    }
    
    const { reservationId, amount } = baseResult.data;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reservationId)) {
      console.warn('Non-UUID reservation ID detected:', reservationId);
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true, payment: true },
    });

    if (!reservation) {
      throw new NotFoundError("Reservation not found");
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenError("You are not authorized to make a payment for this reservation");
    }

    if (reservation.status === ReservationStatus.Cancelled) {
      throw new ConflictError("Cannot process payment for a cancelled reservation");
    }

    if (reservation.payment && reservation.payment.status === PaymentStatus.Completed) {
      throw new ConflictError("Payment for this reservation has already been completed");
    }

    const paymentSuccessful = Math.random() > 0.1;

    const paymentStatus = paymentSuccessful ? PaymentStatus.Completed : PaymentStatus.Failed;

    const [payment, updatedReservation] = await prisma.$transaction([
      // Update or create payment
      prisma.payment.upsert({
        where: { reservationId },
        update: {
          amount,
          status: paymentStatus,
        },
        create: {
          reservationId,
          amount,
          status: paymentStatus,
        },
      }),
      
      // Update reservation status if payment is successful
      prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: paymentSuccessful ? ReservationStatus.Confirmed : ReservationStatus.Pending,
        },
        include: {
          tickets: true,
          payment: true,
        },
      })
    ]);

    // Update ticket statuses if payment was successful
    if (paymentSuccessful) {
      await prisma.ticket.updateMany({
        where: { reservationId },
        data: { status: 'Booked' },
      });
    } else {
      return errorResponse(new ConflictError("Payment failed. Please try again."));
    }

    return successResponse(payment, "Payment processed successfully");
  } catch (error) {
    return errorResponse(error);
  }
}
