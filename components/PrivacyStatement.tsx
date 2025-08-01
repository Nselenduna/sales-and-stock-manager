/**
 * Module: PrivacyStatement
 * Scope: Mobile onboarding privacy statement
 * Constraints:
 *   - Accessible and low-literacy friendly
 *   - Voice narration support
 *   - WCAG AA compliant
 *   - Plain English language
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';

interface PrivacyStatementProps {
  onAccept: () => void;
  onDecline: () => void;
  onSkip?: () => void;
}

const PrivacyStatement: React.FC<PrivacyStatementProps> = ({
  onAccept,
  onDecline,
  onSkip,
}) => {
  const [isNarrating, setIsNarrating] = useState(false);

  const handleVoiceNarration = () => {
    setIsNarrating(true);

    // Voice narration script
    const script =
      'Welcome to Sales and Stocks Manager. We care about your privacy. This app only saves what you type - your name, email, and business info. We keep it safe and never share it. You can see, change, or delete your data anytime. Questions? Just tap Contact Us.';

    // In a real implementation, you would use a text-to-speech library
    // For now, we'll simulate it with an alert
    Alert.alert('Voice Narration', script, [
      { text: 'OK', onPress: () => setIsNarrating(false) },
    ]);
  };

  const handleAccept = () => {
    // Store user consent
    // In a real app, you would save this to AsyncStorage or your backend
    console.log('User accepted privacy statement');
    onAccept();
  };

  const handleDecline = () => {
    Alert.alert(
      'Privacy Required',
      'This app needs your consent to save your data. Without accepting, you cannot use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: onAccept },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Icon name='shield' size={48} color='#007AFF' />
          <Text style={styles.title} accessibilityRole='header'>
            Your Data, Your Rights
          </Text>
          <Text style={styles.subtitle}>Plain English Privacy Statement</Text>
        </View>

        {/* Voice Narration Button */}
        <TouchableOpacity
          style={styles.narrationButton}
          onPress={handleVoiceNarration}
          accessibilityLabel='Listen to privacy statement'
          accessibilityHint='Plays voice narration of the privacy statement'
        >
          <Icon name='volume' size={24} color='#007AFF' />
          <Text style={styles.narrationText}>
            {isNarrating ? 'Playing...' : 'Listen to this'}
          </Text>
        </TouchableOpacity>

        {/* Privacy Content */}
        <View style={styles.content}>
          {/* What We Save */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name='save' size={24} color='#34C759' />
              <Text style={styles.sectionTitle}>What We Save</Text>
            </View>
            <Text style={styles.sectionText}>
              This app only saves the info you type in:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>Your name and email</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Your product and sales info
                </Text>
              </View>
            </View>
          </View>

          {/* How We Keep It Safe */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name='lock' size={24} color='#FF9500' />
              <Text style={styles.sectionTitle}>How We Keep It Safe</Text>
            </View>
            <Text style={styles.sectionText}>
              We keep this data safe and private.
            </Text>
          </View>

          {/* Your Rights */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name='checkmark' size={24} color='#34C759' />
              <Text style={styles.sectionTitle}>Your Rights</Text>
            </View>
            <Text style={styles.sectionText}>You can:</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>See your info</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>Change or delete it</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>Ask us to stop saving it</Text>
              </View>
            </View>
          </View>

          {/* What We Don't Do */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name='close' size={24} color='#FF3B30' />
              <Text style={styles.sectionTitle}>What We Don't Do</Text>
            </View>
            <Text style={styles.sectionText}>
              We never sell or share your data.
            </Text>
          </View>

          {/* Need Help */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name='help' size={24} color='#007AFF' />
              <Text style={styles.sectionTitle}>Need Help?</Text>
            </View>
            <Text style={styles.sectionText}>
              Questions? Tap "Contact Us" or email salesandstocks.com
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
            accessibilityLabel='Accept privacy statement'
            accessibilityHint='Accepts the privacy statement and continues to the app'
          >
            <Text style={styles.acceptButtonText}>Accept & Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
            accessibilityLabel='Decline privacy statement'
            accessibilityHint='Declines the privacy statement'
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={onSkip}
              accessibilityLabel='Skip privacy statement'
              accessibilityHint='Skips the privacy statement for now'
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  narrationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  narrationText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  content: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56, // WCAG AA compliant touch target
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  declineButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
});

export default PrivacyStatement;
