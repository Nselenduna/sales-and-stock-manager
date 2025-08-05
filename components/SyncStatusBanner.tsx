import React, { useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';

export type SyncStatus = 'idle' | 'syncing' | 'queued' | 'failed' | 'success';

interface SyncStatusBannerProps {
  status: SyncStatus;
  message?: string;
  onRetry?: () => void;
  queueCount?: number;
}

const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({
  status,
  message,
  onRetry,
  queueCount = 0,
}) => {
  const config = useMemo(() => {
    switch (status) {
      case 'syncing':
        return {
          icon: 'sync',
          color: '#007AFF',
          backgroundColor: '#f0f8ff',
          text: 'Syncing changes...',
        };
      case 'queued':
        return {
          icon: 'cloud-upload',
          color: '#FF9500',
          backgroundColor: '#fff8f0',
          text: `Queued ${queueCount} change${queueCount !== 1 ? 's' : ''} while offline`,
        };
      case 'failed':
        return {
          icon: 'alert-circle',
          color: '#FF3B30',
          backgroundColor: '#fff0f0',
          text: message || 'Sync failed',
        };
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: '#34C759',
          backgroundColor: '#f0fff0',
          text: 'Sync completed',
        };
      default:
        return {
          icon: 'info',
          color: '#666',
          backgroundColor: '#f8f8f8',
          text: 'Unknown status',
        };
    }
  }, [status, message, queueCount]);

  if (status === 'idle') {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.backgroundColor },
      ]}
      accessible={true}
      accessibilityLabel={`Sync status: ${config.text}`}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {status === 'syncing' ? (
            <ActivityIndicator size="small" color={config.color} style={styles.icon} />
          ) : (
            <Icon name={config.icon} size={20} color={config.color} style={styles.icon} />
          )}
          <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
        </View>

        {status === 'failed' && onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: config.color }]}
            onPress={onRetry}
            accessible={true}
            accessibilityLabel="Retry sync"
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { color: config.color }]}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default memo(SyncStatusBanner); 