import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/response";
import { ConflictError } from "@/lib/errors";
import { ms } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(3, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["Admin", "Organizer", "Customer"]).default("Customer"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role } = registerSchema.parse(body);

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
    });

    const accessToken = await createAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    const response = successResponse(
      {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
      "User registered successfully",
      201
    );

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
      maxAge: ms(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") / 1000,
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
