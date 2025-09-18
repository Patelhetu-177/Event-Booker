import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { errorResponse, successResponse } from "@/lib/response";
import { ForbiddenError, ConflictError } from "@/lib/errors";
import { Role } from "@prisma/client";

const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["Admin", "Organizer", "Customer"]).default("Customer"),
});

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    
    if (userRole !== Role.Admin) {
      throw new ForbiddenError("Admin access required");
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(users, "Users retrieved successfully");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    
    if (userRole !== Role.Admin) {
      throw new ForbiddenError("Admin access required");
    }

    const body = await req.json();
    const { name, email, password, role } = createUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(user, "User created successfully", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
