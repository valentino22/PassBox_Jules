// PassBox/store/authStore.ts
// Placeholder for global authentication state management.

export interface AuthState {
  masterKey: Uint8Array | null;
  isBiometricsEnabledByUser: boolean; // User's preference from settings
  isVaultUnlocked: boolean; // Current runtime state of the vault
}

export const authStorePlaceholder: AuthState = {
  masterKey: null,
  isBiometricsEnabledByUser: false,
  isVaultUnlocked: false,
};

console.log('PassBox/store/authStore.ts loaded (with AuthState export)');
