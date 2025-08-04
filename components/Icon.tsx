import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000',
  style,
}) => {
  const getIconSymbol = (iconName: string) => {
    const icons: { [key: string]: string } = {
      // Navigation and UI
      search: '🔍',
      add: '➕',
      edit: '✏️',
      save: '💾',
      cancel: '❌',
      delete: '🗑️',
      close: '✕',
      menu: '☰',
      home: '🏠',
      back: '←',
      forward: '→',
      next: '▶️',
      previous: '◀️',

      // Arrows and chevrons
      'arrow-back': '←',
      'arrow-left': '←',
      'arrow-right': '→',
      'arrow-up': '⬆️',
      'arrow-down': '⬇️',
      'chevron-left': '〈',
      'chevron-right': '〉',
      'chevron-up': '⌃',
      'chevron-down': '⌄',

      // Status and feedback
      check: '✅',
      'checkmark-circle': '✅',
      'check-circle': '✅',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      'alert-circle': '⚠️',
      'alert-triangle': '⚠️',
      'close-circle': '❌',
      'x-circle': '❌',
      x: '✕',

      // Common actions
      plus: '➕',
      'plus-circle': '➕',
      minus: '➖',
      trash: '🗑️',
      sync: '🔄',
      refresh: '🔄',
      download: '⬇️',
      upload: '⬆️',
      share: '📤',

      // Time and date
      time: '⏰',
      clock: '🕐',
      'clock-outline': '🕐',
      calendar: '📅',

      // People and users
      person: '👤',
      user: '👤',
      users: '👥',

      // Products and inventory
      cube: '📦',
      'cube-outline': '📦',
      package: '📦',
      box: '📦',
      inventory: '📦',

      // Sales and commerce
      'shopping-cart': '🛒',
      receipt: '🧾',
      price: '💰',
      'credit-card': '💳',

      // Technology
      camera: '📷',
      'camera-off': '📷',
      'qr-code': '📱',
      barcode: '📱',
      'barcode-info': '📱',

      // Location and navigation
      location: '📍',
      'location-info': '📍',

      // Settings and configuration
      settings: '⚙️',
      filter: '🔧',
      sort: '📊',

      // Information and help
      help: '❓',
      'help-circle': '❓',
      question: '❓',

      // Lists and data
      list: '📋',
      history: '📜',

      // Links and connections
      link: '🔗',

      // Flash and camera controls
      'flash-off': '⚡',
      'flash-on': '⚡',
      'flash-auto': '⚡',
      'camera-switch': '🔄',

      // Product management
      'add-product': '➕',
      'save-product': '💾',
      'product-info': 'ℹ️',
      'stock-info': '📦',
      'price-info': '💰',
      'category-info': '📂',
      'description-info': '📝',

      // Analytics and trends
      'trending-up': '📈',
      'trending-down': '��',
      'bar-chart': '📊',
      'pie-chart': '🥧',

      // Targets and goals
      target: '🎯',
      kpi: '🎯',

      // Ideas and insights
      lightbulb: '💡',
      insights: '💡',

      // User management
      'person-add': '👤➕',
      login: '🔐',
      logout: '🚪',

      // Security
      backup: '💾',
      shield: '🛡️',
      lock: '🔒',
      unlock: '🔓',
      key: '🔑',
      security: '🔐',

      // Notifications
      notifications: '🔔',
      bell: '🔔',

      // System status
      'sync-status': '🔄',
      offline: '📴',
      online: '🟢',
      'error-status': '🔴',
      'warning-status': '🟡',
      'success-status': '🟢',
      'info-status': '🔵',

      // Analytics and dashboard
      dashboard: '📊',
      analytics: '📈',
      reports: '📋',
      performance: '📊',
      turnover: '🔄',
      retention: '👥',
      growth: '📈',
      forecast: '🔮',
      trends: '📈',
      metrics: '📊',
      monitoring: '👁️',
      'real-time': '⚡',
      live: '🟢',
      status: '📊',
      overview: '👁️',
      summary: '📋',
      details: '🔍',
      'drill-down': '🔽',
      expand: '⏷',
      collapse: '⏶',
      navigate: '🧭',
      breadcrumb: '🏠',
      'menu-toggle': '☰',
      minimize: '➖',
      maximize: '➕',
      fullscreen: '⛶',
      window: '⊞',
      tab: '📑',

      // Files and documents
      folder: '📁',
      file: '📄',
      document: '📄',
      spreadsheet: '📊',
      chart: '📈',
      graph: '📊',

      // Data and storage
      data: '💾',
      database: '🗄️',
      server: '🖥️',
      cloud: '☁️',

      // Network and connectivity
      network: '🌐',
      wifi: '📶',
      signal: '📡',
      connection: '🔗',

      // Activity and monitoring
      activity: '📊',
      'online-users': '👥',
      'low-stock': '⚠️',

      // Export and sharing
      export: '📤',

      // Eye and visibility
      eye: '👁️',
    };
    return icons[iconName] || '❓';
  };

  return (
    <Text style={[styles.icon, { fontSize: size, color }, style]}>
      {getIconSymbol(name)}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});

export default Icon;
