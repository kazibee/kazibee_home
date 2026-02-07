import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:auth-middleware");

// Export a configured cookie-parser middleware.
// If COOKIE_SECRET is set, signed cookies will be verified.
import cookieParserLib from "cookie-parser";
const secret = process.env.COOKIE_SECRET;
const cookieParserMiddleware = cookieParserLib(secret);
export default cookieParserMiddleware;

/**
 * Auth middleware that validates JWT tokens from cookies or headers.
 *
 * Token sources (checked in order):
 * 1. Authorization: Bearer <token> header
 * 2. token cookie
 * 3. x-auth-token header
 *
 * On success, populates req.user with the JWT payload.
 *
 * This is an example middleware pattern. To add database user lookup:
 * 1. Create a UserRepo with sqlstack
 * 2. Inject it and call findById() to verify the user exists
 */
export async function is_auth(
  req: Request & { cookies?: Record<string, string>; user?: any },
  res: Response,
  next: NextFunction
) {
  // Initialize context if it doesn't exist
  if (!(req as any).context) {
    (req as any).context = {};
  }

  logger.debug("[is_auth] Middleware called", {
    hasContext: !!(req as any).context,
    url: req.url
  });

  try {
    // Debug bypass: X-Debug-User-Id header allows acting as any user (dev only)
    // This is useful for development/testing when you don't have full auth setup
    const debugUserId = req.headers['x-debug-user-id'] as string | undefined;
    if (debugUserId && process.env.NODE_ENV !== 'production') {
      const userId = Number(debugUserId);
      if (Number.isFinite(userId) && userId > 0) {
        const debugUser = { id: userId, email: `debug-user-${userId}@example.com` };
        (req as any).user = debugUser;
        (req as any).context.user = debugUser;
        logger.debug("[is_auth] Debug user bypass", { userId });
        return next();
      }
    }

    const header = req.headers?.authorization || req.headers?.Authorization as any;
    const bearer = typeof header === 'string' && header.toLowerCase().startsWith('bearer ')
      ? header.slice(7).trim()
      : undefined;
    const cookieToken = req.cookies?.token;
    const token = bearer || cookieToken || (req.headers['x-auth-token'] as string | undefined);

    if (!token) {
      return res.status(401).json({ error: true, message: 'Unauthorized: missing token' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: true, message: 'Server misconfiguration' });
    }

    const payload = jwt.verify(token, jwtSecret) as { id?: number; email?: string };
    const userId = typeof payload.id === 'number' ? payload.id : undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;

    if (!userId) {
      return res.status(401).json({ error: true, message: 'Unauthorized: invalid token payload' });
    }

    // Basic auth: use JWT payload directly
    // This works without database lookup - the JWT itself is the source of truth
    const user = { id: userId, email: email || '' };

    // Optional: Add database user lookup here to verify user still exists
    // Example:
    // const userRepo = await container.get(UserRepo);
    // const dbUser = await userRepo.findById(userId);
    // if (!dbUser) {
    //   return res.status(401).json({ error: true, message: 'Unauthorized: user not found' });
    // }

    (req as any).user = user;
    (req as any).context.user = user;

    logger.debug("[is_auth] User authenticated", {
      userId: user.id,
      hasContext: !!(req as any).context,
      contextHasUser: !!(req as any).context?.user,
    });

    return next();
  } catch (err) {
    return res.status(401).json({ error: true, message: 'Unauthorized: invalid token' });
  }
}

/**
 * Middleware to copy req.user to req.context.user.
 * Useful when you want user info available in context for other middleware.
 */
export function add_user_to_context(req: any, res: any, next: any) {
  if (!req.context) {
    req.context = {};
  }
  if (req.user) {
    req.context.user = req.user;
  }
  next();
}
