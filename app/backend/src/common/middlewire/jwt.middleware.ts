// src/common/middleware/jwt.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Импорт расширения типа Request
import '../types/express';

declare module 'express' {
  interface Request {
    user?: jwt.JwtPayload;
  }
}

const client = jwksClient({
  jwksUri:
    'https://<KEYCLOAK_DOMAIN>/realms/<REALM>/protocol/openid-connect/certs',
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(
    header.kid,
    (err: Error | null, key: jwksClient.SigningKey | undefined) => {
      const signingKey = key?.getPublicKey();
      callback(err, signingKey);
    }
  );
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  use(req: Request, _: Response, next: NextFunction): void {
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('JWT токен не найден');
    }

    jwt.verify(token, getKey, (err, decoded) => {
      if (err) {
        throw new UnauthorizedException('Недействительный JWT токен');
      }

      req.user = decoded as jwt.JwtPayload;
      next();
    });
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
