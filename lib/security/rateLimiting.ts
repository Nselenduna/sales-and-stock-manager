import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECURITY_CONFIG } from './config';

interface LoginAttempt {
  timestamp: number;
  success: boolean;
}

export class RateLimiter {
  private static async getLoginAttempts(
    email: string
  ): Promise<LoginAttempt[]> {
    try {
      const attempts = await AsyncStorage.getItem(`loginAttempts:${email}`);
      return attempts ? JSON.parse(attempts) : [];
    } catch (error) {
      console.error('Error getting login attempts:', error);
      return [];
    }
  }

  private static async saveLoginAttempts(
    email: string,
    attempts: LoginAttempt[]
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `loginAttempts:${email}`,
        JSON.stringify(attempts)
      );
    } catch (error) {
      console.error('Error saving login attempts:', error);
    }
  }

  static async recordLoginAttempt(
    email: string,
    success: boolean
  ): Promise<void> {
    const attempts = await this.getLoginAttempts(email);
    const now = Date.now();

    // Remove attempts older than reset time
    const recentAttempts = attempts.filter(
      attempt =>
        now - attempt.timestamp < SECURITY_CONFIG.login.attemptsResetTime
    );

    recentAttempts.push({ timestamp: now, success });
    await this.saveLoginAttempts(email, recentAttempts);
  }

  static async isLoginAllowed(email: string): Promise<boolean> {
    const attempts = await this.getLoginAttempts(email);
    const now = Date.now();

    // Count recent failed attempts
    const recentFailures = attempts.filter(
      attempt =>
        !attempt.success &&
        now - attempt.timestamp < SECURITY_CONFIG.login.attemptsResetTime
    ).length;

    // Check if user is in lockout period after max attempts
    if (recentFailures >= SECURITY_CONFIG.login.maxAttempts) {
      const lastFailure = Math.max(
        ...attempts.filter(a => !a.success).map(a => a.timestamp)
      );
      const lockoutEnds = lastFailure + SECURITY_CONFIG.login.lockoutDuration;

      if (now < lockoutEnds) {
        return false;
      }
    }

    return true;
  }
}
