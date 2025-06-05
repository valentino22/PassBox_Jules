# PassBox: Secure Password Manager

## 1. Overview

PassBox is a cross-platform mobile application (iOS & Android) designed to securely store and manage your passwords. It leverages a zero-knowledge architecture, ensuring that your sensitive data is encrypted and decrypted directly on your device. Only you, with your master password, can access your plaintext information.

This project is currently under active development. The features described below represent the current state of the application's core security framework.

## 2. Features Implemented (Core Framework)

*   **Secure Master Key Storage:** Utilizes `Expo SecureStore` (iOS Keychain / Android Keystore) to securely store the master key material (`K`), derived from your master password and protected by device biometrics (Face ID, Fingerprint, etc.).
*   **End-to-End Encryption Framework:** Implements a Key Encryption Key (KEK) model:
    *   The master key (`K`) encrypts per-item keys (`Ki`).
    *   Each per-item key (`Ki`) encrypts the sensitive data of a specific vault item (e.g., the password).
    *   Currently uses placeholder cryptographic functions for broad framework testing.
*   **Biometric Unlock:** Supports unlocking the application and accessing the master key material via device biometrics.
*   **In-Memory Key Protection:** The master key (`K`) and per-item keys (`Ki`) are cleared from memory when the app is backgrounded or on sign-out.
*   **Settings for Biometrics:** Allows users to enable/disable biometric unlock and handles updates to SecureStore if the master password changes while biometrics are active.
*   **Client-Side Encryption Testing:** Includes a dedicated test screen (`VaultTestScreen`) to demonstrate and verify the on-device encryption and decryption cycle.

## 3. Tech Stack (Key Components)

*   **Frontend:** React Native (Expo SDK 50+)
*   **Language:** TypeScript
*   **Cryptography (Placeholders/Expo Libs):** `expo-secure-store`, `expo-crypto` (for random generation, future crypto primitives via `react-native-crypto`).
*   **Backend (Planned):** Supabase (not yet integrated in current client-side framework).

## 4. Project Structure Overview

The project is organized into several key directories within `PassBox/`:

*   `screens/`: Contains UI components for different application screens (e.g., `App.tsx` (root), `BiometricsOptInScreen.tsx`, `SettingsScreen.tsx`, `VaultTestScreen.tsx`).
*   `services/`: Houses modules for specific functionalities:
    *   `crypto.ts`: Core cryptographic operations, SecureStore interactions, key derivation (currently placeholders).
    *   `vault.ts`: Logic for encrypting and decrypting vault items.
    *   `auth.ts`: Placeholder for authentication services.
*   `store/`: Manages global application state (e.g., `authStore.ts` for authentication status and in-memory keys - currently a placeholder).
*   `types/`: Defines shared TypeScript interfaces and types (e.g., `VaultItem`, `Result`).
*   `navigation/`: (Planned) Will contain React Navigation stacks and configurations.

## 5. Setup and Installation

### Prerequisites

*   **Node.js:** LTS version (e.g., 18.x or 20.x).
*   **Yarn** or **npm:** Latest version.
*   **Expo CLI:** Install globally: `npm install -g expo-cli` or `yarn global add expo-cli`.
*   **Git:** For cloning the repository.
*   **iOS/Android Development Environment:**
    *   For iOS: Xcode (macOS).
    *   For Android: Android Studio, Android SDK.
    *   Alternatively, use a physical device with the Expo Go app.

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd PassBox
    ```
    (Note: Replace `<repository-url>` with the actual URL when available.)

2.  **Install dependencies:**
    ```bash
    npm install
    # OR
    yarn install
    ```

### Environment Variables

Currently, no `.env` file or specific environment variables are required to run the client-side features that have been implemented. This will change when Supabase integration is added.

## 6. Running the App

1.  **Start the Metro Bundler:**
    ```bash
    npx expo start
    ```
    This will open a development server instance in your browser.

2.  **Run on a device/simulator:**
    *   **iOS Simulator:** Press `i` in the Metro Bundler terminal.
    *   **Android Emulator/Simulator:** Press `a` in the Metro Bundler terminal (ensure an emulator is running or a device is connected with USB debugging enabled).
    *   **Physical Device (Expo Go):**
        1.  Install the "Expo Go" app from the App Store (iOS) or Google Play Store (Android).
        2.  Scan the QR code displayed by the Metro Bundler with the Expo Go app.

## 7. Using Current Test Features

The application currently uses a simplified navigation model within `App.tsx` to access different test screens.

*   **App Launch & Biometric Unlock:**
    *   On first launch (or after clearing app data/SecureStore), the app will typically start in an "AuthFlow" state.
    *   If you have previously enabled biometric unlock (see below) and a key is in SecureStore, the app will attempt biometric unlock. A system prompt will appear. Success will transition to "AppFlow".
    *   If biometrics are changed or invalid, an error will be shown.

*   **Biometric Opt-In (`BiometricsOptInScreen.tsx`):**
    *   From the main "AuthFlow" screen (placeholder), click "Go to Biometric Opt-In (Test)".
    *   Tap "Enable Biometrics". This will simulate storing a master key (`K`) in SecureStore, protected by biometrics. You'll be prompted for device authentication.
    *   You can also skip this step.

*   **Settings Screen (`SettingsScreen.tsx`):**
    *   From the main "AppFlow" screen (after successful unlock/biometric opt-in), click "Go to Settings".
    *   **Toggle Biometric Unlock:** Enable or disable the storage of `K` in SecureStore. This will trigger biometric prompts.
    *   **Simulate Master Password Change:** If biometrics are enabled, this button simulates a master password change by attempting to store a *new* placeholder master key in SecureStore (will require biometric auth).
    *   The screen includes "Dev Info" showing the current state of `K` in memory and biometric preferences for easier testing.

*   **Vault Encryption Test Screen (`VaultTestScreen.tsx`):**
    *   From the "AppFlow" screen, click "Go to Vault Encryption Test".
    *   Ensure `K` is available in memory (the screen indicates this status. If not, go to Settings and use the "Simulate K loaded into memory" dev button, or restart app after biometric opt-in).
    *   Enter a title and password.
    *   Click "Encrypt & Prepare Data". The screen will display the encrypted components (ciphertext, IVs, encrypted per-item key) in hex format.
    *   Click "Decrypt Stored Data" to decrypt the displayed components back to the original password.

**Important Note on Current State:**
*   The application currently uses **placeholder cryptographic functions**. This means the "encryption" is simulated (e.g., by appending `_encrypted`) and is **NOT SECURE** for real data. This is for testing the overall framework and key management.
*   Master key (`K`) derivation from a password is also currently a placeholder.

## 8. Security Notes (Core Principles)

*   **Zero-Knowledge Goal:** The application is designed so that plaintext sensitive data never leaves the user's device. The server (Supabase, when integrated) will only store encrypted blobs.
*   **Master Key Handling:**
    *   The master key `K` is derived from the user's master password using Argon2id (planned, currently placeholder derivation).
    *   `K` is stored in `Expo SecureStore` if biometric unlock is enabled.
    *   `K` is cleared from memory when the app is backgrounded.
*   **Per-Item Keys (`Ki`):** A unique random key (`Ki`) is generated for each vault item. `Ki` is encrypted by `K`, and `Ki` encrypts the item's sensitive fields. This allows for easier re-keying if a master password changes.
*   **Cryptography:** Actual cryptographic operations (AES-GCM, Argon2id) will be implemented using `react-native-crypto` or similar robust libraries.

## 9. Next Steps / Future Work

*   Implement actual cryptographic functions (AES-GCM, Argon2id) to replace current placeholders.
*   Develop the full authentication flow (sign-up with master password, sign-in, email verification, password reset).
*   Integrate with Supabase for backend storage of profiles and encrypted vault items.
*   Build out the UI for CRUD operations on vault items, search, password generation, and other features as per the Product Requirements Document (PRD).
