import { NextRequest } from "next/server";
import { revokeRefreshToken, verifyRefreshToken } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const refreshTokenCookie = req.cookies.get("refreshToken");

    if (refreshTokenCookie && refreshTokenCookie.value) {
      const tokenToRevoke = refreshTokenCookie.value;
      const verifiedToken = await verifyRefreshToken(tokenToRevoke);

      if (verifiedToken) {
        await revokeRefreshToken(verifiedToken.id);
      }
    }

    const response = successResponse({}, "Logged out successfully", 200);
    response.cookies.set("refreshToken", "", {
      expires: new Date(0),
      path: "/api/auth/refresh",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Logout Error:", error);
    return errorResponse(error);
  }
}
