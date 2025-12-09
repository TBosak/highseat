import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '../types';

export class UserService {
  static async getUserById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  static async updateThemePreference(
    userId: string,
    preferredThemeId: string,
    preferredStyleMode?: string
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        preferredThemeId,
        preferredStyleMode,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }
}
