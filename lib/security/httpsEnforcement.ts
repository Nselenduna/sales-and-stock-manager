import { Platform } from 'react-native';
import { SECURITY_CONFIG } from './config';

export class HttpsEnforcement {
  static isHttpsRequired(): boolean {
    if (Platform.OS === 'web' && SECURITY_CONFIG.https.enforceInProduction) {
      return process.env.NODE_ENV === 'production';
    }
    return false;
  }

  static validateHost(host: string): boolean {
    if (!SECURITY_CONFIG.https.enforceInProduction) return true;
    if (Platform.OS !== 'web') return true;

    return SECURITY_CONFIG.https.allowedHosts.some(pattern => {
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$'
      );
      return regex.test(host);
    });
  }

  static redirectToHttps(): void {
    /* eslint-disable no-undef */
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location.protocol === 'http:' &&
      this.isHttpsRequired() &&
      this.validateHost(window.location.hostname)
    ) {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
    /* eslint-enable no-undef */
  }
}
