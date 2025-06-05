// PassBox/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { storeKeyInSecureStore, deleteKeyFromSecureStore, SecureStoreError, zeroFillKey } from '../services/crypto';
import { authStorePlaceholder } from '../store/authStore'; // Using placeholder
import { Buffer } from 'buffer'; // For dev notes

// !!! DEVELOPMENT ONLY: Placeholder for Master Key Material (K) !!!
// This is used if authStorePlaceholder.masterKey is null when trying to enable biometrics.
// In a real flow, if K is not in memory, user would be prompted for master password.
const DEVELOPMENT_ONLY_MASTER_KEY_FOR_SETTINGS = new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
]);

// Add a new placeholder key for the "new" master key after a simulated change
const DEVELOPMENT_ONLY_NEW_K_PRIME = new Uint8Array([
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
  117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132
]);

export default function SettingsScreen() {
  // This local state would ideally reflect the persisted user preference
  // and whether a key is *actually* in SecureStore.
  // For now, we assume it can be toggled.
  const [biometricsEnabled, setBiometricsEnabled] = useState(authStorePlaceholder.isBiometricsEnabledByUser);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Effect to sync with global state if it changes elsewhere (e.g. initial load or backgrounding)
  useEffect(() => {
    setBiometricsEnabled(authStorePlaceholder.isBiometricsEnabledByUser);
  }, [authStorePlaceholder.isBiometricsEnabledByUser]);


  const handleToggleBiometrics = async (value: boolean) => {
    setIsLoading(true);
    setFeedbackMessage(null);

    if (value) { // Attempting to enable biometrics
      let keyToStore = authStorePlaceholder.masterKey;

      if (!keyToStore) {
        Alert.alert(
          "Developer Note",
          "Master key not in memory. Using a placeholder key for enabling biometrics in settings. In a real app, you'd be prompted for your master password."
        );
        keyToStore = DEVELOPMENT_ONLY_MASTER_KEY_FOR_SETTINGS;
        // It's important to consider if this dev key should actually be put into authStorePlaceholder.masterKey
        // For now, we'll use it directly for storeKeyInSecureStore without altering the global state yet.
      }

      const result = await storeKeyInSecureStore(keyToStore);
      if (result.ok) {
        authStorePlaceholder.isBiometricsEnabledByUser = true;
        setBiometricsEnabled(true);
        setFeedbackMessage('Biometric unlock successfully enabled!');
        Alert.alert('Success', 'Biometric unlock has been enabled.');
      } else {
        let userMessage = 'Could not enable biometric unlock.';
        if (result.error instanceof SecureStoreError) {
          if (result.error.message.includes('Biometrics may not be set up')) {
            userMessage = 'Failed to enable. Please ensure Face ID / fingerprint is set up in your device settings first.';
          } else if (result.error.message === 'ERR_SECURESTORE_AUTH_NOT_CONFIGURED' ) {
             userMessage = 'Biometric authentication is not configured on this device. Please set it up in your device settings.';
          }
           else {
            userMessage = `Error: ${result.error.message}`;
          }
        }
        setFeedbackMessage(userMessage);
        Alert.alert('Error Enabling Biometrics', userMessage);
        setBiometricsEnabled(false);
        authStorePlaceholder.isBiometricsEnabledByUser = false;
      }
    } else { // Attempting to disable biometrics
      const result = await deleteKeyFromSecureStore();
      if (result.ok) {
        authStorePlaceholder.isBiometricsEnabledByUser = false;
        setBiometricsEnabled(false);
        setFeedbackMessage('Biometric unlock disabled. Key removed from SecureStore.');
        Alert.alert('Success', 'Biometric unlock has been disabled.');
      } else {
        setFeedbackMessage(`Error disabling biometrics: ${result.error.message}`);
        Alert.alert('Error Disabling Biometrics', `Could not disable biometric unlock: ${result.error.message}`);
        // If disabling failed, the switch should reflect that biometrics might still be effectively enabled.
        // Forcing it true, or better, having a way to check SecureStore status if possible.
        // For now, we'll assume it might still be enabled if deletion fails.
        setBiometricsEnabled(true);
        authStorePlaceholder.isBiometricsEnabledByUser = true; // Reflect that we couldn't disable it.
      }
    }
    setIsLoading(false);
  };

  const handleSimulateMasterPasswordChange = async () => {
    if (!authStorePlaceholder.isBiometricsEnabledByUser) {
      Alert.alert("Info", "Biometric unlock is not currently enabled. This action updates the key stored for biometrics.");
      return;
    }

    setIsLoading(true);
    setFeedbackMessage('Simulating master password change and updating SecureStore...');
    Alert.alert("Simulating", "This will now attempt to overwrite the key in SecureStore with a new (simulated) master key, as if your master password changed.");

    // 1. Simulate new K' derivation
    const newKPrime = DEVELOPMENT_ONLY_NEW_K_PRIME;

    // 2. Store the new K' in SecureStore. This will prompt for biometrics.
    const result = await storeKeyInSecureStore(newKPrime);

    if (result.ok) {
      // Also update the in-memory key if the app were to continue running with this new key.
      // For this simulation, if K was in memory, it should be replaced by newKPrime.
      if (authStorePlaceholder.masterKey) {
        zeroFillKey(authStorePlaceholder.masterKey); // Zero out old K from memory
      }
      authStorePlaceholder.masterKey = new Uint8Array(newKPrime); // Store new K' in memory (make a copy)
      authStorePlaceholder.isVaultUnlocked = true; // Assume vault is now unlocked with new K'

      setFeedbackMessage('Master password change simulated. New key stored in SecureStore and updated in memory.');
      Alert.alert('Success', 'SecureStore updated with new (simulated) master key.');
    } else {
      let userMessage = 'Could not update key in SecureStore after simulated master password change.';
      if (result.error instanceof SecureStoreError) {
        userMessage = `Error: ${result.error.message}`;
      }
      setFeedbackMessage(userMessage);
      Alert.alert('Error', userMessage);
    }
    setIsLoading(false);
  };

  // Helper to refresh current display of K status for dev note
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000); // Force re-render for dev notes
    return () => clearInterval(interval);
  }, []);


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Enable Biometric Unlock</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={biometricsEnabled ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={handleToggleBiometrics}
          value={biometricsEnabled}
          disabled={isLoading}
        />
      </View>

      {/* Button for simulating master password change */}
      {authStorePlaceholder.isBiometricsEnabledByUser && ( // Only show if biometrics are on
        <View style={styles.buttonContainer}>
          <Button
            title="Simulate Master Password Change"
            onPress={handleSimulateMasterPasswordChange}
            disabled={isLoading}
            color="#ff8c00" // Orange color for distinction
          />
          <Text style={styles.devNoteSmall}>
            This simulates deriving a new master key (K') and attempts to save it to SecureStore, overwriting the old K.
            You will be prompted for biometrics to authorize this.
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      {feedbackMessage && (
        <Text style={[styles.feedbackText, feedbackMessage.toLowerCase().startsWith('error') || feedbackMessage.startsWith('Could not') || feedbackMessage.startsWith('Failed') ? styles.errorText : styles.successText]}>
          {feedbackMessage}
        </Text>
      )}

      <View style={styles.devNote}>
        <Text>Dev Info:</Text>
        <Text>K in memory: {authStorePlaceholder.masterKey ? `YES (Content: ${Buffer.from(authStorePlaceholder.masterKey).slice(0,4).join(',')},...)` : 'NO'}</Text>
        <Text>Vault Unlocked: {authStorePlaceholder.isVaultUnlocked ? 'YES' : 'NO'}</Text>
        <Text>Biometrics Set by User (authStore): {authStorePlaceholder.isBiometricsEnabledByUser ? 'YES' : 'NO'}</Text>
        <Text>Switch State (local): {biometricsEnabled ? 'YES' : 'NO'}</Text>
      </View>
      <Button title="Simulate K loaded (Dev Key 1)" onPress={() => {
          const devKey1 = DEVELOPMENT_ONLY_MASTER_KEY_FOR_SETTINGS;
          if (!authStorePlaceholder.masterKey || Buffer.from(authStorePlaceholder.masterKey).toString('hex') !== Buffer.from(devKey1).toString('hex') ) {
              if(authStorePlaceholder.masterKey) zeroFillKey(authStorePlaceholder.masterKey);
              authStorePlaceholder.masterKey = new Uint8Array(devKey1); // Make a copy
              authStorePlaceholder.isVaultUnlocked = true;
              Alert.alert("Dev Tool", "Dev Key 1 loaded into authStore.masterKey and vault marked as unlocked.");
              setFeedbackMessage("Dev: Dev Key 1 loaded. Vault unlocked.");
          } else {
              Alert.alert("Dev Tool", "Dev Key 1 already in authStore.masterKey.");
          }
          setTick(t => t+1);
      }} />
      <Button title="Simulate K loaded (Dev Key K')" onPress={() => {
          const devKeyNew = DEVELOPMENT_ONLY_NEW_K_PRIME;
          if (!authStorePlaceholder.masterKey || Buffer.from(authStorePlaceholder.masterKey).toString('hex') !== Buffer.from(devKeyNew).toString('hex') ) {
              if(authStorePlaceholder.masterKey) zeroFillKey(authStorePlaceholder.masterKey);
              authStorePlaceholder.masterKey = new Uint8Array(devKeyNew); // Make a copy
              authStorePlaceholder.isVaultUnlocked = true;
              Alert.alert("Dev Tool", "Dev Key K' loaded into authStore.masterKey and vault marked as unlocked.");
              setFeedbackMessage("Dev: Dev Key K' loaded. Vault unlocked.");
          } else {
              Alert.alert("Dev Tool", "Dev Key K' already in authStore.masterKey.");
          }
          setTick(t => t+1);
      }} />
       <Button title="Simulate K cleared from memory (DEV)" onPress={() => {
          if (authStorePlaceholder.masterKey) {
              zeroFillKey(authStorePlaceholder.masterKey);
              authStorePlaceholder.masterKey = null;
              authStorePlaceholder.isVaultUnlocked = false;
              Alert.alert("Dev Tool", "K cleared from authStore.masterKey and vault marked as locked.");
              setFeedbackMessage("Dev: K cleared from memory. Vault locked.");
          } else {
              Alert.alert("Dev Tool", "K already null in authStore.masterKey.");
          }
          setTick(t => t+1);
      }} />
       <Button title="Go Back (Simulated - To App.tsx)" onPress={() => {
           Alert.alert("Navigate", "This would take you back, e.g., to AppFlow in App.tsx. Please use App.tsx's navigation for now if integrated.");
       }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Added padding top for better visibility if no header
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  settingText: {
    fontSize: 18,
  },
  buttonContainer: { // New style
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  feedbackText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 14,
    padding: 10,
    borderRadius: 5,
  },
  successText: {
    color: 'green',
    backgroundColor: '#e6ffed',
  },
  errorText: {
    color: 'red',
    backgroundColor: '#ffe6e6',
  },
  devNote: {
    marginTop: 15,
    padding:10,
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  devNoteSmall: { // New style
    fontSize: 10,
    color: 'gray',
    textAlign: 'center',
    marginTop: 5,
  }
});
