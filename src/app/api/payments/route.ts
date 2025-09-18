import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NotFoundError, UnauthorizedError, ConflictError, ForbiddenError } from "@/lib/errors";
import { PaymentStatus, ReservationStatus } from "@prisma/client";

const paymentSchema = z.object({
  reservationId: z.string().uuid("Invalid reservation ID"),
  amount: z.number().positive("Amount must be a positive number"),
});

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    const body = await req.json();
    const { reservationId, amount } = paymentSchema.parse(body);

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

    const payment = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { reservationId },
      });

      if (existingPayment) {
        return tx.payment.update({
          where: { reservationId },
          data: {
            amount,
            status: paymentStatus,
          },
        });
      } else {
        return tx.payment.create({
          data: {
            reservationId,
            amount,
            status: paymentStatus,
          },
        });
      }
    });

    if (!paymentSuccessful) {
      return errorResponse(new ConflictError("Payment failed. Please try again."));
    }

    return successResponse(payment, "Payment processed successfully");
  } catch (error) {
    return errorResponse(error);
  }
}
