import { hash, compare } from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { db } from '../db/index';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { JWTPayload } from '../types';
import { createId } from '@paralleldrive/cuid2';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return hash(password, 10);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }

  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(): string {
    return createId();
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt
    });
  }

  static async validateRefreshToken(token: string): Promise<string | null> {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);

    if (result.length === 0) return null;

    const refreshToken = result[0];
    if (refreshToken.expiresAt < new Date()) {
      // Token expired, delete it
      await db.delete(refreshTokens).where(eq(refreshTokens.id, refreshToken.id));
      return null;
    }

    return refreshToken.userId;
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  static async register(username: string, password: string, displayName?: string, email?: string) {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('Username already taken');
    }

    const passwordHash = await this.hashPassword(password);
    const [user] = await db.insert(users).values({
      username,
      email,
      passwordHash,
      displayName,
      roles: JSON.stringify(['viewer'])
    }).returning();

    const roles = JSON.parse(user.roles);
    const accessToken = this.generateAccessToken({
      userId: user.id,
      username: user.username,
      roles
    });

    const refreshToken = this.generateRefreshToken();
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        roles
      },
      accessToken,
      refreshToken
    };
  }

  static async login(username: string, password: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await this.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const roles = JSON.parse(user.roles);
    const accessToken = this.generateAccessToken({
      userId: user.id,
      username: user.username,
      roles
    });

    const refreshToken = this.generateRefreshToken();
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        roles
      },
      accessToken,
      refreshToken
    };
  }

  static async refresh(refreshToken: string) {
    const userId = await this.validateRefreshToken(refreshToken);
    if (!userId) {
      throw new Error('Invalid refresh token');
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const roles = JSON.parse(user.roles);
    const accessToken = this.generateAccessToken({
      userId: user.id,
      username: user.username,
      roles
    });

    // Revoke old refresh token and issue a new one
    await this.revokeRefreshToken(refreshToken);
    const newRefreshToken = this.generateRefreshToken();
    await this.saveRefreshToken(user.id, newRefreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  }
}
