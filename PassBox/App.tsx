// PassBox/App.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Text, View, StyleSheet, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
import { retrieveKeyFromSecureStore, SecureStoreError, ERR_SECURESTORE_AUTH_NOT_CONFIGURED, zeroFillKey, deleteKeyFromSecureStore } from './services/crypto';
import { authStorePlaceholder, AuthState } from './store/authStore'; // Using placeholder, ensure AuthState is exported
import BiometricsOptInScreen from './screens/BiometricsOptInScreen';
import SettingsScreen from './screens/SettingsScreen'; // Import the new screen
import VaultTestScreen from './screens/VaultTestScreen'; // <-- Import VaultTestScreen


export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  // Simplified routing state: 'Loading', 'AuthFlow', 'AppFlow', 'BiometricOptIn', 'Settings', 'VaultTest'
  const [currentView, setCurrentView] = useState<'Loading' | 'AuthFlow' | 'AppFlow' | 'BiometricOptIn' | 'Settings' | 'VaultTest'>('Loading');

  const appState = useRef(AppState.currentState);

  // Effect for Initial Load & Biometric Check
  useEffect(() => {
    const attemptBiometricUnlock = async () => {
      // Only run this full biometric check if there's no master key and not in a loading state from other processes
      if (authStorePlaceholder.masterKey || currentView !== 'Loading') {
        // If key already exists or not in initial loading, prevent re-running full check.
        // If loading (e.g. from retry button), allow it to proceed.
        if (authStorePlaceholder.masterKey && currentView !== 'AppFlow' && currentView !== 'Settings' && currentView !== 'VaultTest') {
             setCurrentView('AppFlow'); // Already unlocked, ensure not overriding current app sub-views
        } else if (!authStorePlaceholder.masterKey && currentView !== 'AuthFlow' && currentView !== 'BiometricOptIn') {
            // Not loading, no key, and not already in an auth or opt-in flow
             setCurrentView('AuthFlow');
        }
        setIsLoading(false);
        return;
      }

      setStatusMessage('Checking for biometric credentials...');
      setIsLoading(true); // Explicitly set loading true for this async operation
      const result = await retrieveKeyFromSecureStore();

      if (result.ok) {
        const key = result.value;
        if (key) {
          authStorePlaceholder.masterKey = key;
          authStorePlaceholder.isVaultUnlocked = true;
          setStatusMessage('Biometric unlock successful! Welcome back.');
          Alert.alert('Biometric Unlock', 'Successfully unlocked with stored key.');
          console.log('Retrieved master key using biometrics and stored in placeholder state.');
          setCurrentView('AppFlow');
        } else {
          setStatusMessage('Biometric key not found or user cancelled. Please sign in.');
          console.log('Biometric key not found/cancelled.');
          setCurrentView('AuthFlow');
        }
      } else {
        const error = result.error;
        if (error instanceof SecureStoreError && error.message === ERR_SECURESTORE_AUTH_NOT_CONFIGURED) {
          setStatusMessage('Biometrics changed. Please sign in and re-enable biometric unlock.');
          Alert.alert('Biometric Issue', 'Your biometric settings have changed. Sign in to re-configure.');
          console.error('Biometrics configuration changed:', error);
        } else {
          setStatusMessage('Could not perform biometric unlock. Please sign in.');
          Alert.alert('Biometric Error', `An error occurred: ${error.message}. Please sign in.`);
          console.error('Failed to retrieve key from SecureStore:', error);
        }
        setCurrentView('AuthFlow');
      }
      setIsLoading(false);
    };

    if (currentView === 'Loading') { // Trigger only if in 'Loading' state
        attemptBiometricUnlock();
    }
  }, [currentView]); // Depend on currentView to re-trigger if set to 'Loading'


  // Effect for AppState Change (Backgrounding)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        if (!authStorePlaceholder.masterKey && !isLoading) {
            console.log("App active and master key is not present. Vault is locked.");
            if(currentView === 'AppFlow'){
                setCurrentView('AuthFlow');
                setStatusMessage("Re-authentication required as app was backgrounded.");
                Alert.alert("Session Expired", "Please re-authenticate to continue.");
            }
        }
      }

      if (nextAppState.match(/inactive|background/)) {
        console.log('App has gone to the background or become inactive.');
        if (authStorePlaceholder.masterKey) {
          console.log('Master key found in memory. Clearing it due to app backgrounding.');
          zeroFillKey(authStorePlaceholder.masterKey);
          authStorePlaceholder.masterKey = null;
          authStorePlaceholder.isVaultUnlocked = false;
          console.log('In-memory master key zero-filled and cleared. Vault locked.');
          setStatusMessage("App backgrounded. Vault locked for security.");
        } else {
          console.log('App backgrounded. No master key in memory to clear.');
        }
      }
      appState.current = nextAppState;
      console.log('AppState changed to:', appState.current);
    });

    return () => {
      subscription.remove();
      if (authStorePlaceholder.masterKey) {
        console.log("App.tsx unmounting. Clearing master key.");
        zeroFillKey(authStorePlaceholder.masterKey);
        authStorePlaceholder.masterKey = null;
        authStorePlaceholder.isVaultUnlocked = false;
      }
    };
  }, [isLoading, currentView]);

  const handleSimulatedSignOut = async () => {
    console.log("Simulating Sign Out...");
    if (authStorePlaceholder.masterKey) {
      zeroFillKey(authStorePlaceholder.masterKey);
      authStorePlaceholder.masterKey = null;
    }
    authStorePlaceholder.isVaultUnlocked = false;
    const deleteRes = await deleteKeyFromSecureStore();
    if(deleteRes.ok) Alert.alert("Sign Out", "Secure key deleted from SecureStore.");
    else Alert.alert("Sign Out Error", "Could not delete secure key: " + deleteRes.error.message);

    setCurrentView('AuthFlow');
    setStatusMessage("Signed out. Secure key deleted.");
  };

  const handleRetryBiometric = () => {
    setIsLoading(true);
    setCurrentView('Loading');
  };

  const navigateBackToAppFlow = () => setCurrentView('AppFlow');

  if (isLoading && currentView === 'Loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>{statusMessage}</Text>
      </View>
    );
  }

  switch (currentView) {
    case 'AppFlow':
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Welcome to PassBox (App Flow)</Text>
          <Text>{statusMessage}</Text>
          {authStorePlaceholder.isVaultUnlocked ? <Text style={{color: 'green'}}>Vault is UNLOCKED</Text> : <Text style={{color: 'red'}}>Vault is LOCKED</Text>}
          <Text onPress={handleSimulatedSignOut} style={styles.link}>Sign Out (Simulated)</Text>
          <Text onPress={() => setCurrentView('Settings')} style={styles.link}>Go to Settings</Text>
          <Text onPress={() => setCurrentView('VaultTest')} style={styles.link}>Go to Vault Encryption Test</Text>
        </View>
      );
    case 'AuthFlow':
      return (
        <View style={styles.container}>
          <Text style={styles.title}>PassBox Sign In (Auth Flow)</Text>
          <Text>{statusMessage}</Text>
          {authStorePlaceholder.isVaultUnlocked ? <Text style={{color: 'green'}}>Vault is UNLOCKED</Text> : <Text style={{color: 'red'}}>Vault is LOCKED</Text>}
          <Text style={styles.link} onPress={handleRetryBiometric}>Retry Biometric/Initial Load</Text>
          <Text style={styles.link} onPress={() => setCurrentView('BiometricOptIn')}>Go to Biometric Opt-In (Test)</Text>
        </View>
      );
    case 'BiometricOptIn':
      return <BiometricsOptInScreen />;
    case 'Settings':
      return <SettingsScreen />; // SettingsScreen currently has its own "Go Back (Simulated)" button
    case 'VaultTest':
      return <VaultTestScreen goBack={navigateBackToAppFlow} />;
    default:
      // Includes 'Loading' state if isLoading is false but view is still 'Loading' (should not happen)
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" />
          <Text>{statusMessage || "Loading or unknown view..."}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  link: {
    marginTop: 15,
    paddingVertical: 5,
    color: 'blue',
    textDecorationLine: 'underline',
  }
});
