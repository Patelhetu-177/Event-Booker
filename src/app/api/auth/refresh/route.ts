import { NextRequest } from "next/server";
import { createAccessToken, rotateRefreshToken, verifyRefreshToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { UnauthorizedError } from "@/lib/errors";
import { ms } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const refreshTokenCookie = req.cookies.get("refreshToken");

    if (!refreshTokenCookie || !refreshTokenCookie.value) {
      throw new UnauthorizedError("Refresh token not found");
    }

    const oldRefreshToken = refreshTokenCookie.value;
    const verifiedToken = await verifyRefreshToken(oldRefreshToken);

    if (!verifiedToken) {
      const response = errorResponse(new UnauthorizedError("Invalid refresh token"));
      response.cookies.delete("refreshToken");
      return response;
    }

    const user = await prisma.user.findUnique({ where: { id: verifiedToken.userId } });
    if (!user) {
      const response = errorResponse(new UnauthorizedError("User not found"));
      response.cookies.delete("refreshToken");
      return response;
    }

    const newRefreshToken = await rotateRefreshToken(oldRefreshToken, user.id);
    const newAccessToken = await createAccessToken(user);

    const response = successResponse({ accessToken: newAccessToken }, "Tokens refreshed successfully", 200);

    response.cookies.set("refreshToken", newRefreshToken, {
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
