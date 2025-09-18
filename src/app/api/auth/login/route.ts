import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/response";
import { UnauthorizedError } from "@/lib/errors";
import { ms } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const accessToken = await createAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    const response = successResponse(
      {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
      "Logged in successfully",
      200
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
