import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// ── Cognito JWT Verifier ──────────────────────────────────────────────────────
// Validates: signature (via JWKS), issuer, audience/clientId, and expiration.
// JWKS are fetched on first use and cached automatically by aws-jwt-verify.
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: Role;
    teamIds?: number[];
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Cryptographically verify the JWT: signature, issuer, clientId, and expiry.
    // Throws if any validation fails.
    const payload = await verifier.verify(token);

    const cognitoId = payload.sub || (payload as any)['cognito:username'];
    if (!cognitoId) {
      res.status(401).json({ message: 'Token missing identity claim' });
      return;
    }

    // Find user in DB
    let user = await prisma.user.findUnique({
      where: { cognitoId },
      include: { teams: true },
    });

    // Auto-onboard if user doesn't exist yet
    if (!user) {
      const username =
        (payload as any)['cognito:username'] ||
        (payload as any).username ||
        `user_${Math.floor(Math.random() * 10000)}`;

      user = await prisma.user.create({
        data: {
          cognitoId,
          username,
          role: 'MEMBER',
          profilePictureUrl: 'i1.jpg',
        },
        include: { teams: true },
      });
    }

    req.user = {
      userId: user.userId,
      role: user.role,
      teamIds: user.teams.map((t) => t.teamId),
    };

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
};
