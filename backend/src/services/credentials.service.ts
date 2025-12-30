import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { credentials } from '../db/schema';
import { encryptionService } from './encryption.service';
import { createId } from '@paralleldrive/cuid2';

export interface CredentialData {
  [key: string]: any;
}

export interface CreateCredentialInput {
  userId: string;
  name: string;
  serviceType: string;
  data: CredentialData;
  metadata?: Record<string, any>;
}

export interface UpdateCredentialInput {
  name?: string;
  data?: CredentialData;
  metadata?: Record<string, any>;
}

export interface Credential {
  id: string;
  userId: string;
  name: string;
  serviceType: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialWithData extends Credential {
  data: CredentialData;
}

/**
 * Credentials service - manages encrypted credentials for API integrations
 */
export class CredentialsService {
  /**
   * Create a new credential
   * @param input - Credential creation data
   * @returns The created credential (without decrypted data)
   */
  async createCredential(input: CreateCredentialInput): Promise<Credential> {
    try {
      console.log(`[Credentials Service] Creating credential: ${input.name} (${input.serviceType}) for user ${input.userId}`);

      // Encrypt the sensitive data
      const encryptedData = encryptionService.encryptJSON(input.data);

      // Create the credential
      const [credential] = await db.insert(credentials).values({
        id: createId(),
        userId: input.userId,
        name: input.name,
        serviceType: input.serviceType,
        encryptedData,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning({
        id: credentials.id,
        userId: credentials.userId,
        name: credentials.name,
        serviceType: credentials.serviceType,
        metadata: credentials.metadata,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt
      });

      console.log(`[Credentials Service] Created credential: ${credential.id}`);

      return {
        ...credential,
        metadata: credential.metadata ? JSON.parse(credential.metadata) : null
      };
    } catch (error) {
      console.error('[Credentials Service] Error creating credential:', error);
      throw new Error('Failed to create credential');
    }
  }

  /**
   * Get a credential by ID (with decrypted data)
   * @param credentialId - Credential ID
   * @param userId - User ID (for authorization)
   * @returns The credential with decrypted data, or null if not found
   */
  async getCredential(credentialId: string, userId: string): Promise<CredentialWithData | null> {
    try {
      const [credential] = await db
        .select()
        .from(credentials)
        .where(and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId)
        ))
        .limit(1);

      if (!credential) {
        return null;
      }

      // Decrypt the data
      const data = encryptionService.decryptJSON<CredentialData>(credential.encryptedData);

      return {
        id: credential.id,
        userId: credential.userId,
        name: credential.name,
        serviceType: credential.serviceType,
        metadata: credential.metadata ? JSON.parse(credential.metadata) : null,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
        data
      };
    } catch (error) {
      console.error('[Credentials Service] Error getting credential:', error);
      throw new Error('Failed to get credential');
    }
  }

  /**
   * List all credentials for a user (without decrypted data)
   * @param userId - User ID
   * @param serviceType - Optional service type filter
   * @returns Array of credentials
   */
  async listCredentials(userId: string, serviceType?: string): Promise<Credential[]> {
    try {
      const conditions = [eq(credentials.userId, userId)];

      if (serviceType) {
        conditions.push(eq(credentials.serviceType, serviceType));
      }

      const results = await db
        .select({
          id: credentials.id,
          userId: credentials.userId,
          name: credentials.name,
          serviceType: credentials.serviceType,
          metadata: credentials.metadata,
          createdAt: credentials.createdAt,
          updatedAt: credentials.updatedAt
        })
        .from(credentials)
        .where(and(...conditions))
        .orderBy(credentials.createdAt);

      return results.map(cred => ({
        ...cred,
        metadata: cred.metadata ? JSON.parse(cred.metadata) : null
      }));
    } catch (error) {
      console.error('[Credentials Service] Error listing credentials:', error);
      throw new Error('Failed to list credentials');
    }
  }

  /**
   * Update a credential
   * @param credentialId - Credential ID
   * @param userId - User ID (for authorization)
   * @param input - Update data
   * @returns The updated credential (without decrypted data)
   */
  async updateCredential(
    credentialId: string,
    userId: string,
    input: UpdateCredentialInput
  ): Promise<Credential | null> {
    try {
      console.log(`[Credentials Service] Updating credential: ${credentialId}`);

      // First, verify the credential exists and belongs to the user
      const existing = await this.getCredential(credentialId, userId);
      if (!existing) {
        return null;
      }

      const updates: any = {
        updatedAt: new Date()
      };

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (input.data !== undefined) {
        // Re-encrypt the data with new values
        updates.encryptedData = encryptionService.encryptJSON(input.data);
      }

      if (input.metadata !== undefined) {
        updates.metadata = JSON.stringify(input.metadata);
      }

      const [updated] = await db
        .update(credentials)
        .set(updates)
        .where(and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId)
        ))
        .returning({
          id: credentials.id,
          userId: credentials.userId,
          name: credentials.name,
          serviceType: credentials.serviceType,
          metadata: credentials.metadata,
          createdAt: credentials.createdAt,
          updatedAt: credentials.updatedAt
        });

      if (!updated) {
        return null;
      }

      console.log(`[Credentials Service] Updated credential: ${updated.id}`);

      return {
        ...updated,
        metadata: updated.metadata ? JSON.parse(updated.metadata) : null
      };
    } catch (error) {
      console.error('[Credentials Service] Error updating credential:', error);
      throw new Error('Failed to update credential');
    }
  }

  /**
   * Delete a credential
   * @param credentialId - Credential ID
   * @param userId - User ID (for authorization)
   * @returns True if deleted, false if not found
   */
  async deleteCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      console.log(`[Credentials Service] Deleting credential: ${credentialId}`);

      const result = await db
        .delete(credentials)
        .where(and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId)
        ))
        .returning({ id: credentials.id });

      const deleted = result.length > 0;

      if (deleted) {
        console.log(`[Credentials Service] Deleted credential: ${credentialId}`);
      }

      return deleted;
    } catch (error) {
      console.error('[Credentials Service] Error deleting credential:', error);
      throw new Error('Failed to delete credential');
    }
  }

  /**
   * Test a credential by attempting to decrypt it
   * @param credentialId - Credential ID
   * @param userId - User ID (for authorization)
   * @returns True if credential can be decrypted, false otherwise
   */
  async testCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      const credential = await this.getCredential(credentialId, userId);
      return credential !== null;
    } catch (error) {
      console.error('[Credentials Service] Error testing credential:', error);
      return false;
    }
  }
}

// Export singleton instance
export const credentialsService = new CredentialsService();
