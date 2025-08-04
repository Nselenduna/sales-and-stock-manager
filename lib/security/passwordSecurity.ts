import { SECURITY_CONFIG } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PasswordHistory {
  hash: string;
  timestamp: number;
}

export class PasswordSecurity {
  private static readonly PASSWORD_REGEX = {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    numbers: /[0-9]/,
    special: /[!@#$%^&*(),.?":{}|<>]/,
  };

  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < SECURITY_CONFIG.password.minLength) {
      errors.push(
        `Password must be at least ${SECURITY_CONFIG.password.minLength} characters long`
      );
    }

    if (
      SECURITY_CONFIG.password.requireUppercase &&
      !this.PASSWORD_REGEX.uppercase.test(password)
    ) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (
      SECURITY_CONFIG.password.requireLowercase &&
      !this.PASSWORD_REGEX.lowercase.test(password)
    ) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (
      SECURITY_CONFIG.password.requireNumbers &&
      !this.PASSWORD_REGEX.numbers.test(password)
    ) {
      errors.push('Password must contain at least one number');
    }

    if (
      SECURITY_CONFIG.password.requireSpecial &&
      !this.PASSWORD_REGEX.special.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static async addToPasswordHistory(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    try {
      const history = await this.getPasswordHistory(userId);
      history.push({ hash: passwordHash, timestamp: Date.now() });

      // Keep only the most recent passwords based on config
      while (history.length > SECURITY_CONFIG.password.preventReuse) {
        history.shift();
      }

      await AsyncStorage.setItem(
        `passwordHistory:${userId}`,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Error saving password history:', error);
    }
  }

  static async getPasswordHistory(userId: string): Promise<PasswordHistory[]> {
    try {
      const history = await AsyncStorage.getItem(`passwordHistory:${userId}`);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting password history:', error);
      return [];
    }
  }

  static async isPasswordPreviouslyUsed(
    userId: string,
    passwordHash: string
  ): Promise<boolean> {
    const history = await this.getPasswordHistory(userId);
    return history.some(entry => entry.hash === passwordHash);
  }

  static async isPasswordExpired(userId: string): Promise<boolean> {
    const history = await this.getPasswordHistory(userId);
    if (history.length === 0) return false;

    const lastPasswordChange = Math.max(
      ...history.map(entry => entry.timestamp)
    );
    const expiryTime =
      lastPasswordChange +
      SECURITY_CONFIG.password.expiryDays * 24 * 60 * 60 * 1000;

    return Date.now() > expiryTime;
  }
}
