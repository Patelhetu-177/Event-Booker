import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { nanoid } from "nanoid";
import { User, Role } from "@prisma/client";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { ms } from "./utils";

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
const REFRESH_TOKEN_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

interface UserPayload extends JWTPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export const createAccessToken = async (user: User) => {
  const payload: UserPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name || "",
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(nanoid())
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(ACCESS_TOKEN_SECRET);
};

export const createRefreshToken = async (userId: string) => {
  const refreshTokenId = nanoid(); 

  const refreshPayload = {
    userId: userId,
    jti: refreshTokenId,
  };

  const signedRefreshJwt = await new SignJWT(refreshPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(refreshTokenId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(REFRESH_TOKEN_SECRET);

  const tokenHash = await bcrypt.hash(signedRefreshJwt, 10); 

  await prisma.refreshToken.create({
    data: {
      id: refreshTokenId, 
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + ms(REFRESH_TOKEN_EXPIRES_IN)),
    },
  });
  return signedRefreshJwt;
};

export const verifyAccessToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });
    return payload as UserPayload; 
  } catch {
    return null;
  }
};

export const verifyRefreshToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, REFRESH_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });

    const jti = payload.jti as string;

    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: { id: jti }, 
    });

    if (!storedRefreshToken || storedRefreshToken.revoked) {
      return null;
    }

    const isMatch = await bcrypt.compare(token, storedRefreshToken.tokenHash);
    if (!isMatch) {
      return null;
    }

    
    if (storedRefreshToken.expiresAt && storedRefreshToken.expiresAt < new Date()) {
      return null;
    }
    return storedRefreshToken;
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    return null;
  }
};

export const revokeRefreshToken = async (tokenId: string) => {
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: { revoked: true },
  });
};

export const rotateRefreshToken = async (oldToken: string, userId: string) => {
  const oldRefreshTokenData = await verifyRefreshToken(oldToken);

  if (!oldRefreshTokenData) {
    throw new Error("Invalid refresh token");
  }

  await revokeRefreshToken(oldRefreshTokenData.id);
  const newRefreshToken = await createRefreshToken(userId);
  return newRefreshToken;
};
