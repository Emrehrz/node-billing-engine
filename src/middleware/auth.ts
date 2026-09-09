import { Request, Response, NextFunction } from 'express';

// Phase 6 will implement full JWT validation. 
// For now, this is a mock to fulfill Phase 3's requirement of an "authenticated user ID".
export const requireAuthMock = (req: Request, res: Response, next: NextFunction) => {
  // Use a hardcoded dummy UUID for the user ID. 
  // We'll create this user in the database or just let foreign keys fail if we test without creating a user?
  // Actually, wait: we need a real user ID in the DB to satisfy the foreign key constraint `user_id REFERENCES users(id)`.
  // So when manually testing, we will need to create a user first.
  
  // For the purpose of the mock, let's grab a UUID from an 'X-Mock-User-Id' header, 
  // or fallback to a hardcoded one (which might fail FK constraint if not seeded).
  const mockUserId = req.header('X-Mock-User-Id') || '00000000-0000-0000-0000-000000000000';
  
  (req as any).user = { id: mockUserId };
  next();
};
