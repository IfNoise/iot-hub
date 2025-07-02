// src/common/types/express.d.ts
import { AuthenticatedUser } from './keycloak-user.interface.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
