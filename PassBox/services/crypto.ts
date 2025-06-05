import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Buffer } from 'buffer'; // Ensure 'buffer' is installed or use existing base64 capabilities
import { getRandomValues } from 'expo-crypto'; // For zeroFillKey
import { Result, Ok, Err, SecureStoreError, ERR_SECURESTORE_AUTH_NOT_CONFIGURED } from '../types'; // Adjusted import path

export const SECURE_STORE_KEY_K = "passbox:k";
const AUTHENTICATION_PROMPT = "Unlock PassBox";

// Placeholder for Argon2id derivation (from sub-task 3.1)
// export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<Result<Uint8Array, Error>> { ... }

// Placeholder for AES-GCM functions (from sub-task 3.2)
// export async function encryptAESGCM(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Result<Uint8Array, Error>> { ... }
// export async function decryptAESGCM(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Result<Uint8Array, Error>> { ... }


export async function storeKeyInSecureStore(key: Uint8Array): Promise<Result<void, SecureStoreError>> {
  try {
    const keyString = Buffer.from(key).toString('base64');
    await SecureStore.setItemAsync(SECURE_STORE_KEY_K, keyString, {
      requireAuthentication: true,
      authenticationPrompt: AUTHENTICATION_PROMPT,
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY // iOS specific option for better security
    });
    return Ok(undefined);
  } catch (error: any) {
      // Enhanced error checking for storeKeyInSecureStore
      // ERR_SECURESTORE_SET_ITEM is a common code from expo-secure-store for various issues.
      // We also look for messages indicating biometric issues or user cancellation if specific codes aren't available.
      let specificMessage = 'Failed to save key to SecureStore.';
      if (error.code === 'ERR_SECURESTORE_SET_ITEM' || error.code === 'ERR_SECURESTORE_UNKNOWN_ERROR') { // Common expo-secure-store general error codes
        if (error.message?.toLowerCase().includes('biometric') || error.message?.toLowerCase().includes('face id') || error.message?.toLowerCase().includes('fingerprint')) {
          specificMessage = 'Failed to save key: Biometrics may not be set up or user cancelled. Please ensure biometrics are configured on your device.';
        } else if (error.message?.toLowerCase().includes('user canceled') || error.message?.toLowerCase().includes('cancelled')) {
            specificMessage = 'Key storage cancelled by user.';
        } else {
          specificMessage = `Failed to save key: ${error.message}`;
        }
      } else if (error.message?.toLowerCase().includes('user canceled') || error.message?.toLowerCase().includes('cancelled')) {
        // Catch user cancellations that might not have a specific error code
        specificMessage = 'Key storage cancelled by user.';
      } else {
        specificMessage = `Failed to store key in SecureStore: An unexpected error occurred. ${error.message}`;
      }
      return Err(new SecureStoreError(specificMessage, error));
  }
}

export async function retrieveKeyFromSecureStore(): Promise<Result<Uint8Array | null, SecureStoreError>> {
  try {
    const keyString = await SecureStore.getItemAsync(SECURE_STORE_KEY_K, {
      requireAuthentication: true,
      authenticationPrompt: AUTHENTICATION_PROMPT,
    });

    if (keyString === null) {
         // This can mean the key doesn't exist, or on iOS, user might have cancelled the prompt.
         // It's safer to treat as "key not found or user cancelled" rather than an error.
         console.log('retrieveKeyFromSecureStore: getItemAsync returned null. Key may not exist or user cancelled (iOS).');
         return Ok(null);
    }
    return Ok(new Uint8Array(Buffer.from(keyString, 'base64')));
  } catch (error: any) {
      // Order of checks matters here. More specific errors first.
      if (error.code === 'ERR_SECURESTORE_AUTH_NOT_CONFIGURED' ||
          (Platform.OS === 'ios' && error.message?.toLowerCase().includes('authentication context was invalidated')) ||
          (Platform.OS === 'android' && error.message?.toLowerCase().includes('no security keys'))) { // Android specific for no enrollment
        return Err(new SecureStoreError(ERR_SECURESTORE_AUTH_NOT_CONFIGURED, error));
      }
      // ERR_SECURESTORE_ITEM_NOT_FOUND means the key definitely does not exist.
      if (error.code === 'ERR_SECURESTORE_ITEM_NOT_FOUND') {
        return Ok(null);
      }
      // Check for user cancellation patterns, which might throw an error on Android instead of returning null.
      if (error.message?.toLowerCase().includes('user canceled') ||
          error.message?.toLowerCase().includes('cancelled') ||
          error.code === 'ERR_SECURESTORE_USER_CANCELED') { // Hypothetical more specific code for cancel
        console.log('retrieveKeyFromSecureStore: User cancelled biometric prompt (caught as error).');
        return Ok(null);
      }
      // Fallback for other SecureStore errors
      return Err(new SecureStoreError(`Failed to retrieve key from SecureStore: ${error.message}`, error));
  }
}

export async function deleteKeyFromSecureStore(): Promise<Result<void, SecureStoreError>> {
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY_K, {
         requireAuthentication: false,
    });
    return Ok(undefined);
  } catch (error: any) {
      // Check for specific errors relevant to deletion, if any.
      // For example, if the item doesn't exist, some implementations might throw an error.
      // However, expo-secure-store's deleteItemAsync typically does not error if item is not found.
      if (error.code === 'ERR_SECURESTORE_DELETE_ITEM') { // Generic error during delete
        return Err(new SecureStoreError(`Failed to delete key from SecureStore: ${error.message}`, error));
      }
      // Fallback for other unexpected errors
      return Err(new SecureStoreError(`Failed to delete key from SecureStore: An unexpected error occurred. ${error.message}`, error));
  }
}

export function zeroFillKey(key: Uint8Array): void {
  try {
    // `crypto.getRandomValues` is the standard Web Crypto API way
    // For React Native, `expo-crypto` provides `getRandomValues`
    getRandomValues(key);
    // Or, if a synchronous fill is strictly needed and available:
    // key.fill(0); // Simpler, but less cryptographically "random" overwrite
    // For true zeroization if `getRandomValues` isn't suitable for *overwriting existing buffer directly*:
    // const randomBuffer = new Uint8Array(key.length);
    // getRandomValues(randomBuffer);
    // key.set(randomBuffer); // This overwrites `key` with random data.
    // Or simply: key.fill(0) if the goal is just to prevent trivial memory snooping.
    // The user feedback mentioned `crypto.randomFillSync(buf)`. If this is available via react-native-crypto polyfills, use it.
    // Assuming `getRandomValues` is sufficient for overwriting as per modern JS engines.
  } catch (e) {
     // Fallback in case of error during zero-fill (e.g. if key is unexpectedly not a Uint8Array)
     console.warn("Failed to zero-fill key:", e);
     // As a last resort, try a simple fill if possible.
     if (key && typeof key.fill === 'function') {
         key.fill(0);
     }
  }
}

 // --- Argon2id Key Derivation Placeholder (from original PRD sub-task 3.1) ---
 export async function deriveKeyFromPassword_placeholder(
   password: string,
   salt: Uint8Array
 ): Promise<Result<Uint8Array, Error>> {
   console.log('deriveKeyFromPassword_placeholder called with password (length):', password.length, 'salt:', salt);
   // In a real implementation, this would use argon2.
   // For now, return a dummy key of 32 bytes (256 bits) derived from password for simulation.
   // THIS IS NOT SECURE and only for placeholder purposes.
   try {
     // crypto.subtle requires the environment to be secure (HTTPS) or localhost.
     // TextEncoder will work in any JS environment.
     const combined = new TextEncoder().encode(password + Buffer.from(salt).toString('hex'));
     // Using crypto.subtle.digest which is standard Web Crypto API.
     // Ensure this is available in the React Native environment (usually polyfilled by expo-crypto or react-native-crypto)
     const digest = await crypto.subtle.digest('SHA-256', combined);
     return Ok(new Uint8Array(digest));
   } catch (e: any) {
     return Err(new Error(`Placeholder key derivation failed: ${e.message}`));
   }
 }

 // --- IV Generation ---
 export function generateRandomIV(): Uint8Array {
   // AES-GCM standard IV size is 12 bytes (96 bits)
   const iv = new Uint8Array(12);
   getRandomValues(iv); // Provided by expo-crypto
   return iv;
 }

 // --- AES-GCM Encryption/Decryption Placeholders (from original PRD sub-task 3.2) ---
 // These functions demonstrate how K (masterKey) would be passed.
 // Actual implementation would use react-native-crypto for AES-GCM.

 export interface AESEncryptionResult {
   ciphertext: Uint8Array;
   iv: Uint8Array;
   // Salt might be associated with KDF, not directly with each encryption using K.
   // If K is used to encrypt per-item keys (Ki), then Ki's salt might be here.
   // For now, keeping it simple.
 }

 /**
  * Placeholder for AES-GCM encryption.
  * In a real scenario, K (masterKey) might encrypt a per-item key (Ki),
  * and Ki would encrypt the actual data.
  * This placeholder shows K being passed.
  */
 export async function encryptAESGCM_placeholder(
   plaintext: Uint8Array,
   key: Uint8Array, // This is K (masterKey) or a per-item key Ki
   iv: Uint8Array
 ): Promise<Result<AESEncryptionResult, Error>> {
   console.log('encryptAESGCM_placeholder called. Key length (bytes):', key.length, 'IV length:', iv.length);
   if (key.length !== 32) { // Expecting a 256-bit key
     return Err(new Error('Encryption Error: Key must be 256 bits (32 bytes).'));
   }
   if (iv.length !== 12) { // Expecting a 96-bit IV
     return Err(new Error('Encryption Error: IV must be 96 bits (12 bytes).'));
   }
   // Simulate encryption: Just append "encrypted" to plaintext for now
   // THIS IS NOT SECURE - placeholder only.
   try {
     const simulatedCiphertext = new Uint8Array([...plaintext, ...new TextEncoder().encode('_encrypted')]);
     return Ok({ ciphertext: simulatedCiphertext, iv });
   } catch (e: any) {
     return Err(new Error(`Placeholder encryption failed: ${e.message}`));
   }
 }

 /**
  * Placeholder for AES-GCM decryption.
  */
 export async function decryptAESGCM_placeholder(
   ciphertext: Uint8Array,
   key: Uint8Array, // This is K (masterKey) or a per-item key Ki
   iv: Uint8Array
 ): Promise<Result<Uint8Array, Error>> {
   console.log('decryptAESGCM_placeholder called. Key length (bytes):', key.length, 'IV length:', iv.length);
   if (key.length !== 32) {
     return Err(new Error('Decryption Error: Key must be 256 bits (32 bytes).'));
   }
   if (iv.length !== 12) {
     return Err(new Error('Decryption Error: IV must be 96 bits (12 bytes).'));
   }
   // Simulate decryption: Remove "_encrypted" suffix
   // THIS IS NOT SECURE - placeholder only.
   try {
     const suffix = '_encrypted';
     const suffixBytes = new TextEncoder().encode(suffix);
     if (ciphertext.length < suffixBytes.length) {
       return Err(new Error('Decryption Error: Ciphertext too short.'));
     }
     // Check if suffix matches
     const endOfCiphertext = ciphertext.slice(ciphertext.length - suffixBytes.length);
     let suffixMatch = true;
     for(let i=0; i < suffixBytes.length; i++) {
       if(endOfCiphertext[i] !== suffixBytes[i]) {
         suffixMatch = false;
         break;
       }
     }

     if (!suffixMatch) {
       return Err(new Error('Decryption Error: Simulated ciphertext tag mismatch (suffix not found or incorrect).'));
     }
     const simulatedPlaintext = ciphertext.slice(0, ciphertext.length - suffixBytes.length);
     return Ok(simulatedPlaintext);
   } catch (e: any) {
     return Err(new Error(`Placeholder decryption failed: ${e.message}`));
   }
 }
