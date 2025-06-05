// PassBox/services/vault.ts
import {
  encryptAESGCM_placeholder,
  decryptAESGCM_placeholder,
  generateRandomIV,
  zeroFillKey, // For clearing Ki from memory after use
  // Assuming getRandomValues is used internally by generateRandomIV and zeroFillKey,
  // or we import it directly if needed for generatePerItemKey.
  // For now, let's assume crypto.ts handles getRandomValues exposure or use.
  // If generateRandomIV is the only consumer from crypto.ts, we might need direct import here for Ki generation.
} from './crypto';
import type { VaultItem, EncryptedPasswordDetails } from '../types'; // Ensure path is correct
import { Ok, Err, Result } from '../types'; // Ensure path is correct
import { getRandomValues as expoGetRandomValues } from 'expo-crypto'; // Explicit import for Ki generation

/**
 * Generates a random per-item key (Ki).
 */
function generatePerItemKey(): Uint8Array {
  const ki = new Uint8Array(32); // 256-bit key
  expoGetRandomValues(ki); // Using explicitly imported getRandomValues from expo-crypto
  return ki;
}

export async function encryptVaultItemPassword(
  item: VaultItem,
  masterKey_K: Uint8Array
): Promise<Result<VaultItem, Error>> {
  if (!item.password) {
    return Err(new Error('No password provided in the item to encrypt.'));
  }
  if (!masterKey_K || masterKey_K.length !== 32) {
    return Err(new Error('Master key K is invalid or not provided (must be 32 bytes).'));
  }

  const ki = generatePerItemKey();
  const kiIv = generateRandomIV(); // IV for encrypting Ki

  // 1. Encrypt Ki with masterKey_K
  const encryptedKiResult = await encryptAESGCM_placeholder(ki, masterKey_K, kiIv);
  if (!encryptedKiResult.ok) {
    zeroFillKey(ki); // Clear Ki from memory on failure
    return Err(new Error(`Failed to encrypt per-item key Ki: ${encryptedKiResult.error.message}`));
  }
  // The placeholder returns { ciphertext, iv }, we just need ciphertext for encryptedKi
  const encryptedKi = encryptedKiResult.value.ciphertext;

  // 2. Encrypt the actual password with plaintext Ki
  const passwordBytes = new TextEncoder().encode(item.password);
  const passwordIv = generateRandomIV(); // IV for encrypting the password

  const encryptedPasswordResult = await encryptAESGCM_placeholder(passwordBytes, ki, passwordIv);

  zeroFillKey(ki); // Clear plaintext Ki from memory as soon as it's used

  if (!encryptedPasswordResult.ok) {
    return Err(new Error(`Failed to encrypt password: ${encryptedPasswordResult.error.message}`));
  }
  const passwordCiphertext = encryptedPasswordResult.value.ciphertext;

  const updatedItem: VaultItem = {
    ...item,
    password: undefined, // Clear plaintext password after encryption
    encryptedPasswordDetails: {
      passwordCiphertext,
      passwordIv,
      encryptedKi,
      kiIv,
    },
  };

  return Ok(updatedItem);
}

export async function decryptVaultItemPassword(
  item: VaultItem,
  masterKey_K: Uint8Array
): Promise<Result<VaultItem, Error>> {
  if (!item.encryptedPasswordDetails) {
    return Err(new Error('No encrypted password details found in the item.'));
  }
  if (!masterKey_K || masterKey_K.length !== 32) {
    return Err(new Error('Master key K is invalid or not provided (must be 32 bytes).'));
  }

  const { passwordCiphertext, passwordIv, encryptedKi, kiIv } = item.encryptedPasswordDetails;

  // 1. Decrypt encryptedKi with masterKey_K to get plaintext Ki
  const decryptedKiResult = await decryptAESGCM_placeholder(encryptedKi, masterKey_K, kiIv);
  if (!decryptedKiResult.ok) {
    return Err(new Error(`Failed to decrypt per-item key Ki: ${decryptedKiResult.error.message}`));
  }
  const ki = decryptedKiResult.value;

  // 2. Decrypt the actual password ciphertext with plaintext Ki
  const decryptedPasswordBytesResult = await decryptAESGCM_placeholder(passwordCiphertext, ki, passwordIv);

  zeroFillKey(ki); // Clear plaintext Ki from memory as soon as it's used

  if (!decryptedPasswordBytesResult.ok) {
    return Err(new Error(`Failed to decrypt password: ${decryptedPasswordBytesResult.error.message}`));
  }

  const password = new TextDecoder().decode(decryptedPasswordBytesResult.value);

  const updatedItem: VaultItem = {
    ...item,
    password, // Populate plaintext password
  };

  return Ok(updatedItem);
}
