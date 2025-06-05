// PassBox/screens/BiometricsOptInScreen.tsx
import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet, ActivityIndicator } from 'react-native';
// import { useNavigation } from '@react-navigation/native'; // Navigation will be integrated later
import { storeKeyInSecureStore, SecureStoreError } from '../services/crypto';
// import { useAuthStore } from '../store/authStore'; // Auth store integration will be fleshed out later

// !!! DEVELOPMENT ONLY: Placeholder for Master Key Material (K) !!!
// In a real flow, K would be derived from the user's master password after login/signup
// and securely passed to this screen or retrieved from a temporary, secure state.
// This hardcoded key is ONLY for testing the SecureStore interaction in this component.
const DEVELOPMENT_ONLY_MASTER_KEY = new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
]);

export default function BiometricsOptInScreen() {
  // const navigation = useNavigation(); // For later integration
  // const { setBiometricsActive } = useAuthStore(state => ({ setBiometricsActive: state.setBiometricsActive })); // For later

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleEnableBiometrics = async () => {
    setIsLoading(true);
    setFeedbackMessage(null);

    // Using the placeholder key for development
    const masterKeyMaterial = DEVELOPMENT_ONLY_MASTER_KEY;

    if (!masterKeyMaterial) { // Should not happen with the placeholder
        Alert.alert("Developer Error", "Master key material is unexpectedly missing.");
        setIsLoading(false);
        return;
    }

    const result = await storeKeyInSecureStore(masterKeyMaterial);
    setIsLoading(false);

    if (result.ok) {
      Alert.alert('Success', 'Biometric unlock has been enabled!');
      setFeedbackMessage('Biometric unlock enabled. You can now use it to access your vault.');
      // In a real app:
      // setBiometricsActive(true);
      // navigation.replace('AppStack'); // or navigate to the main part of the app
    } else {
      let userMessage = 'Could not enable biometric unlock.';
      if (result.error instanceof SecureStoreError) {
        if (result.error.message.includes('Biometrics may not be set up')) {
          userMessage = 'Failed to enable biometric unlock. Please ensure Face ID / fingerprint is properly set up in your device settings first.';
        } else if (result.error.message === 'ERR_SECURESTORE_AUTH_NOT_CONFIGURED') { // This check might need adjustment based on actual error from crypto.ts
            userMessage = 'Biometric authentication is not configured on this device. Please set it up in your device settings.';
        } else {
          userMessage = `An error occurred: ${result.error.message}. Please try again.`;
        }
      }
      Alert.alert('Error Enabling Biometrics', userMessage);
      setFeedbackMessage(userMessage);
    }
  };

  const handleSkip = () => {
    Alert.alert('Biometrics Skipped', 'You can enable biometric unlock later from the app settings.');
    setFeedbackMessage('Biometric unlock skipped. You can enable it later in Settings.');
    // In a real app:
    // setBiometricsActive(false);
    // navigation.replace('AppStack'); // or navigate to the main part of the app
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enable Biometric Unlock?</Text>
      <Text style={styles.description}>
        Use your device's Face ID / Fingerprint / Passcode to unlock PassBox quickly and securely.
      </Text>

      <View style={styles.buttonContainer}>
        <Button title="Enable Biometrics" onPress={handleEnableBiometrics} disabled={isLoading} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Skip for Now" onPress={handleSkip} disabled={isLoading} color="#777" />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Setting up biometrics...</Text>
        </View>
      )}

      {feedbackMessage && (
        <Text style={[styles.feedbackText, feedbackMessage.startsWith('Error') || feedbackMessage.startsWith('Could not') || feedbackMessage.startsWith('Failed') ? styles.errorText : styles.successText]}>
          {feedbackMessage}
        </Text>
      )}
      <Text style={styles.devNote}>
        DEVELOPMENT NOTE: This screen uses a placeholder master key for testing the SecureStore interaction.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  buttonContainer: {
    marginVertical: 10,
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
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: 'gray',
    fontStyle: 'italic',
  }
});
