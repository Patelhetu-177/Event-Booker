import jwt from 'jsonwebtoken';

interface JwtPayload extends jwt.JwtPayload {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'your-secret-key');
    return decoded as JwtPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
