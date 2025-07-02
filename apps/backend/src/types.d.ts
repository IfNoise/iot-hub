// src/types.d.ts
import { AuthenticatedUser } from './common/types/keycloak-user.interface.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
