import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
}

// Create fresh client for each request to avoid session state conflicts
function createSupabaseClient() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { 
      autoRefreshToken: false, 
      persistSession: false 
    },
  });
}

// Extended Request interface to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    profile?: {
      userId: string;
      username: string;
      role: string;
      isActive: boolean;
    };
  };
}

/**
 * Authentication middleware - verifies Supabase JWT token
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth middleware - headers:', { 
      authorization: authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'missing',
      path: req.path,
      method: req.method
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth middleware - rejected: missing or invalid header');
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase using fresh client
    console.log('Auth middleware - verifying token:', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 20),
      supabaseUrl: supabaseUrl
    });
    
    const supabase = createSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('Auth middleware - token verification result:', {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message,
      errorCode: error?.code
    });

    if (error || !user) {
      console.error('Auth middleware - token validation failed:', error);
      // Handle specific Supabase auth errors
      if (error?.code === 'session_not_found' || error?.message?.includes('AuthSessionMissingError')) {
        return res.status(401).json({ message: 'Session expired, please log in again' });
      }
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user profile from database
    const profile = await storage.getProfile(user.id);
    
    if (!profile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    if (!profile.isActive) {
      return res.status(403).json({ message: 'User account is deactivated' });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      profile
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
}

/**
 * Admin authorization middleware - ensures user has admin role
 */
export function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.profile) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.profile.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
}

/**
 * Combined auth + admin middleware for admin routes
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  authMiddleware(req, res, (authError) => {
    if (authError) return;
    adminMiddleware(req, res, next);
  });
}