import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { Role } from "@prisma/client";

const updateUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["Admin", "Organizer", "Customer"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get("x-user-role");
    
    if (userRole !== Role.Admin) {
      throw new ForbiddenError("Admin access required");
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return successResponse(user, "User retrieved successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get("x-user-role");
    
    if (userRole !== Role.Admin) {
      throw new ForbiddenError("Admin access required");
    }

    const { id } = await params;
    const body = await req.json();
    const updateData = updateUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });
      if (emailExists) {
        throw new ValidationError("Email already in use");
      }
    }

    const dataToUpdate: Record<string, unknown> = { ...updateData };
    if (updateData.password) {
      dataToUpdate.password = await bcrypt.hash(updateData.password, 10);
    }
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(updatedUser, "User updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get("x-user-role");
    const currentUserId = req.headers.get("x-user-id");
    
    if (userRole !== Role.Admin) {
      throw new ForbiddenError("Admin access required");
    }

    const { id } = await params;
    if (currentUserId === id) {
      throw new ValidationError("Cannot delete your own account");
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    await prisma.user.delete({
      where: { id },
    });

    return successResponse(null, "User deleted successfully", 204);
  } catch (error) {
    return errorResponse(error);
  }
}
