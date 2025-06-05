// PassBox/screens/VaultTestScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { authStorePlaceholder } from '../store/authStore';
import { encryptVaultItemPassword, decryptVaultItemPassword } from '../services/vault';
import type { VaultItem, EncryptedPasswordDetails } from '../types';
import { Buffer } from 'buffer'; // For displaying Uint8Array as hex

interface VaultTestScreenProps {
  goBack: () => void;
}

export default function VaultTestScreen({ goBack }: VaultTestScreenProps) {
  const [title, setTitle] = useState('Test Item');
  const [password, setPassword] = useState('SuperSecret123!');

  const [encryptedItemForDecryption, setEncryptedItemForDecryption] = useState<VaultItem | null>(null);
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [masterKeyAvailable, setMasterKeyAvailable] = useState(!!authStorePlaceholder.masterKey);

  // Effect to update masterKeyAvailable if authStorePlaceholder changes.
  // This is a simple way; a real app might use a store subscription.
  useEffect(() => {
    const checkKey = () => setMasterKeyAvailable(!!authStorePlaceholder.masterKey);
    // Check on mount
    checkKey();
    // And check periodically for demo purposes, or if app comes to foreground
    const intervalId = setInterval(checkKey, 2000); // Check every 2 seconds
    return () => clearInterval(intervalId);
  }, []);

  const displayUint8Array = (arr?: Uint8Array) => arr ? Buffer.from(arr).toString('hex') : 'N/A';

  const handleEncryption = async () => {
    if (!authStorePlaceholder.masterKey) {
      Alert.alert("Error", "Master Key (K) is not available in memory. Cannot encrypt.");
      setFeedbackMessage("Master Key (K) is not available. Please ensure app is 'unlocked'.");
      return;
    }
    if (!password) {
      Alert.alert("Input Error", "Please enter a password to encrypt.");
      return;
    }

    setIsLoading(true);
    setFeedbackMessage('Encrypting...');
    setEncryptedItemForDecryption(null);
    setDecryptedPassword(null);

    const itemToEncrypt: VaultItem = { title, password, username: "testuser" };
    const result = await encryptVaultItemPassword(itemToEncrypt, authStorePlaceholder.masterKey);

    if (result.ok) {
      const encryptedItem = result.value;
      setEncryptedItemForDecryption(encryptedItem);
      setFeedbackMessage('Encryption successful! See details below.');
      Alert.alert('Encryption Success', 'Password encrypted and item prepared.');
      console.log("Encrypted Item Details:", encryptedItem.encryptedPasswordDetails);
    } else {
      setFeedbackMessage(`Encryption failed: ${result.error.message}`);
      Alert.alert('Encryption Failed', result.error.message);
    }
    setIsLoading(false);
  };

  const handleDecryption = async () => {
    if (!encryptedItemForDecryption || !encryptedItemForDecryption.encryptedPasswordDetails) {
      Alert.alert("Error", "No encrypted item available to decrypt. Please encrypt first.");
      setFeedbackMessage("No encrypted data to decrypt.");
      return;
    }
    if (!authStorePlaceholder.masterKey) {
      Alert.alert("Error", "Master Key (K) is not available in memory. Cannot decrypt.");
      setFeedbackMessage("Master Key (K) is not available. Please ensure app is 'unlocked'.");
      return;
    }

    setIsLoading(true);
    setFeedbackMessage('Decrypting...');
    setDecryptedPassword(null);

    // Pass a copy to avoid potential modification issues if decryptVaultItemPassword mutates
    const itemToDecrypt: VaultItem = { ...encryptedItemForDecryption };

    const result = await decryptVaultItemPassword(itemToDecrypt, authStorePlaceholder.masterKey);

    if (result.ok) {
      setDecryptedPassword(result.value.password || "Error: Decryption produced no password.");
      setFeedbackMessage('Decryption successful!');
      Alert.alert('Decryption Success', 'Password decrypted.');
    } else {
      setDecryptedPassword(`DECRYPTION FAILED: ${result.error.message}`);
      setFeedbackMessage(`Decryption failed: ${result.error.message}`);
      Alert.alert('Decryption Failed', result.error.message);
    }
    setIsLoading(false);
  };

  const renderEncryptedDetails = (details?: EncryptedPasswordDetails) => {
    if (!details) return <Text>No encrypted details.</Text>;
    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailTitle}>Encrypted Password Details:</Text>
        <Text selectable>passwordCiphertext (hex): {displayUint8Array(details.passwordCiphertext)}</Text>
        <Text selectable>passwordIv (hex): {displayUint8Array(details.passwordIv)}</Text>
        <Text selectable>encryptedKi (hex): {displayUint8Array(details.encryptedKi)}</Text>
        <Text selectable>kiIv (hex): {displayUint8Array(details.kiIv)}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Vault Encryption Test</Text>

      <Text style={styles.info}>Master Key (K) in memory: {masterKeyAvailable ? 'YES' : 'NO - Cannot perform operations!'}</Text>
      {!masterKeyAvailable &&
        <Text style={styles.warning}>
            (To make K available: Restart app with biometrics enabled & unlock, or use Settings dev buttons to load K)
        </Text>
      }

      <TextInput
        style={styles.input}
        placeholder="Item Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Password to Encrypt"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={false} // Set to false for easier testing of placeholder crypto
      />

      <View style={styles.buttonContainer}>
        <Button title="Encrypt & Prepare Data" onPress={handleEncryption} disabled={isLoading || !masterKeyAvailable} />
      </View>

      {encryptedItemForDecryption && renderEncryptedDetails(encryptedItemForDecryption.encryptedPasswordDetails)}

      {encryptedItemForDecryption && (
        <View style={styles.buttonContainer}>
          <Button title="Decrypt Stored Data" onPress={handleDecryption} disabled={isLoading || !masterKeyAvailable} />
        </View>
      )}

      {decryptedPassword && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailTitle}>Decrypted Password:</Text>
          <Text selectable style={decryptedPassword.startsWith('DECRYPTION FAILED') ? styles.errorTextOutput : styles.successTextOutput}>
            {decryptedPassword}
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Processing...</Text>
        </View>
      )}
      {feedbackMessage && <Text style={styles.feedback}>{feedbackMessage}</Text>}
       <Button title="Go Back to App Flow" onPress={goBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  warning: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
    color: 'orange'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    fontSize: 16,
    borderRadius: 5,
    marginBottom: 15,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  detailsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  detailTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  feedback: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 14,
    color: 'gray',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    zIndex: 10, // Ensure it's on top
  },
  errorTextOutput: { color: 'red', fontWeight: 'bold' },
  successTextOutput: { color: 'green', fontWeight: 'bold' },
});
