import { Role } from "@prisma/client";

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
