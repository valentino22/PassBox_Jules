// In PassBox/types/index.ts or PassBox/services/crypto.ts
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E extends Error>(error: E): Result<never, E> => ({ ok: false, error });

// Custom Error type for SecureStore specific issues
export class SecureStoreError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'SecureStoreError';
  }
}
export const ERR_SECURESTORE_AUTH_NOT_CONFIGURED = 'ERR_SECURESTORE_AUTH_NOT_CONFIGURED';
// Add other specific error constants if needed

export interface EncryptedPasswordDetails {
  passwordCiphertext: Uint8Array;
  passwordIv: Uint8Array;
  encryptedKi: Uint8Array; // The per-item key, encrypted with masterKey_K
  kiIv: Uint8Array;         // The IV used to encrypt Ki
}

export interface VaultItem {
  id?: string | number; // Optional: as it might not exist before saving
  title: string;
  username?: string;
  password?: string; // Plaintext, available before encryption or after decryption
  url?: string;
  notes?: string; // Consider if notes should also be encrypted similarly
  createdAt?: Date;
  updatedAt?: Date;

  // Stores the outcome of encrypting the 'password' field
  encryptedPasswordDetails?: EncryptedPasswordDetails;
}
