import { Role } from "@prisma/client";

// Extend NextRequest interface for custom user property
declare global {
  namespace NextServer {
    interface NextRequest {
      user?: {
        userId: string;
        email: string;
        role: Role;
      };
    }
  }
}
