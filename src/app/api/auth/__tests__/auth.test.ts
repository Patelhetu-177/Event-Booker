import { NextRequest, NextResponse } from "next/server";
import { POST as registerPOST } from "../register/route";
import { POST as loginPOST } from "../login/route";
import { POST as refreshPOST } from "../refresh/route";
import { POST as logoutPOST } from "../logout/route";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jwtVerify } from "jose";
import { verifyRefreshToken } from "@/lib/auth";

const createNextRequest = (method: string, url: string, body?: unknown, headers?: Record<string, string>) => {
  return new NextRequest(new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }));
};

async function getJsonBody(response: NextResponse<unknown>) {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    return {};
  }
}

describe("Auth API Routes", () => {
  beforeAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.event.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should register a new user successfully", async () => {
    const req = createNextRequest("POST", "http://localhost:3000/api/auth/register", {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: Role.Customer,
    });
    const res = await registerPOST(req);
    const data = await getJsonBody(res);

    expect(res.status).toBe(201);
    expect(data.message).toBe("User registered successfully");
    expect(data.data.user).toBeDefined();
    expect(data.data.user.email).toBe("test@example.com");
    expect(data.data.accessToken).toBeDefined();
    expect(res.headers.get("set-cookie")).toContain("refreshToken");
  });

  test("should not register a user with existing email", async () => {
    const req = createNextRequest("POST", "http://localhost:3000/api/auth/register", {
      name: "Existing User",
      email: "test@example.com",
      password: "anotherpassword",
      role: Role.Customer,
    });
    const res = await registerPOST(req);
    const data = await getJsonBody(res);

    expect(res.status).toBe(409);
    expect(data.message).toBe("User with this email already exists");
  });

  test("should not register a user with invalid data", async () => {
    const req = createNextRequest("POST", "http://localhost:3000/api/auth/register", {
      name: "T",
      email: "invalid-email",
      password: "123",
    });
    const res = await registerPOST(req);
    const data = await getJsonBody(res);

    expect(res.status).toBe(400);
    expect(data.message).toBe("Validation Error");
    expect(data.errors).toBeDefined();
  });

  test("should log in an existing user successfully", async () => {
    const req = createNextRequest("POST", "http://localhost:3000/api/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
    const res = await loginPOST(req);
    const data = await getJsonBody(res);

    expect(res.status).toBe(200);
    expect(data.message).toBe("Logged in successfully");
    expect(data.data.user).toBeDefined();
    expect(data.data.accessToken).toBeDefined();
    expect(res.headers.get("set-cookie")).toContain("refreshToken");
  });

  test("should not log in with invalid credentials", async () => {
    const req = createNextRequest("POST", "http://localhost:3000/api/auth/login", {
      email: "test@example.com",
      password: "wrongpassword",
    });
    const res = await loginPOST(req);
    const data = await getJsonBody(res);

    expect(res.status).toBe(401);
    expect(data.message).toBe("Invalid credentials");
  });

  let refreshToken: string | null = null;
  test("should refresh access token using a valid refresh token", async () => {
    const loginReq = createNextRequest("POST", "http://localhost:3000/api/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
    const loginRes = await loginPOST(loginReq);
    await getJsonBody(loginRes);
    expect(loginRes.status).toBe(200);

    const setCookieHeader = loginRes.headers.get("set-cookie");
    if (setCookieHeader) {
      const refreshTokenCookie = setCookieHeader
        .split(";")
        .find((cookie) => cookie.trim().startsWith("refreshToken="));
      if (refreshTokenCookie) {
        refreshToken = refreshTokenCookie.split("=")[1];
      }
    }

    expect(refreshToken).toBeDefined();

    const refreshReq = createNextRequest(
      "POST",
      "http://localhost:3000/api/auth/refresh",
      null,
      { Cookie: `refreshToken=${refreshToken}` }
    );
    const refreshRes = await refreshPOST(refreshReq);
    const refreshData = await getJsonBody(refreshRes);

    expect(refreshRes.status).toBe(200);
    expect(refreshData.message).toBe("Tokens refreshed successfully");
    expect(refreshData.data.accessToken).toBeDefined();
    expect(refreshRes.headers.get("set-cookie")).toContain("refreshToken");

    const oldRefreshTokenEntry = await prisma.refreshToken.findUnique({
      where: { id: (await jwtVerify(refreshToken!, new TextEncoder().encode(process.env.JWT_REFRESH_SECRET))).payload.jti as string },
    });
    expect(oldRefreshTokenEntry?.revoked).toBe(true);
  });

  test("should log out a user and revoke refresh token", async () => {
    const loginReq = createNextRequest("POST", "http://localhost:3000/api/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
    const loginRes = await loginPOST(loginReq);
    expect(loginRes.status).toBe(200);

    const setCookieHeader = loginRes.headers.get("set-cookie");
    let userRefreshToken: string | null = null;
    if (setCookieHeader) {
      const refreshTokenCookie = setCookieHeader
        .split(";")
        .find((cookie) => cookie.trim().startsWith("refreshToken="));
      if (refreshTokenCookie) {
        userRefreshToken = refreshTokenCookie.split("=")[1];
      }
    }
    expect(userRefreshToken).toBeDefined();

    const logoutReq = createNextRequest(
      "POST",
      "http://localhost:3000/api/auth/logout",
      null,
      { Cookie: `refreshToken=${userRefreshToken}` }
    );
    const logoutRes = await logoutPOST(logoutReq);
    const logoutData = await getJsonBody(logoutRes);

    expect(logoutRes.status).toBe(200);
    expect(logoutData.message).toBe("Logged out successfully");
    expect(logoutRes.headers.get("set-cookie")).toContain("refreshToken=; Path=/api/auth/refresh; Expires=Thu, 01 Jan 1970 00:00:00 GMT");

    const verifiedOldToken = await verifyRefreshToken(userRefreshToken!);
    expect(verifiedOldToken).toBeNull();
  });
});
