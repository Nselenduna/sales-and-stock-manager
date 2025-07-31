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
      search: '🔍',
      add: '➕',
      edit: '✏️',
      'qr-code': '📱',
      'checkmark-circle': '✅',
      'check-circle': '✅',
      time: '⏰',
      'alert-circle': '⚠️',
      'cloud-upload': '☁️',
      'arrow-up': '⬆️',
      'arrow-down': '⬇️',
      'close-circle': '❌',
      'cube-outline': '📦',
      settings: '⚙️',
      person: '👤',
      eye: '👁️',
      cube: '📦',
      camera: '📷',
      save: '💾',
      cancel: '❌',
      delete: '🗑️',
      sync: '🔄',
      location: '📍',
      price: '💰',
      barcode: '📱',
      history: '📜',
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      error: '❌',
      'chevron-down': '⌄',
      'chevron-up': '⌃',
      calendar: '📅',
      user: '👤',
      filter: '🔧',
      sort: '📊',
      'shopping-cart': '🛒',
      list: '📋',
      plus: '➕',
      'chevron-right': '〉',
      x: '✕',
      'alert-triangle': '⚠️',
      'arrow-back': '←',
      'plus-circle': '➕',
      'minus': '➖',
      'trash': '🗑️',
      'clock': '🕐',
      'link': '🔗',
      'help-circle': '❓',
      'chevron-left': '〈',
      'home': '🏠',
      'menu': '☰',
      'download': '⬇️',
      'receipt': '🧾',
      'arrow-left': '←',
      'check-circle': '✅',
      'clock-outline': '🕐',
      'alert-circle': '⚠️',
      'close-circle': '❌',
      'x-circle': '❌',
      'help-circle': '❓',
      'receipt': '🧾',
      'price': '💰',
      'clock': '🕐',
      'camera-off': '📷',
      'flash-off': '⚡',
      'flash-on': '⚡',
      'flash-auto': '⚡',
      'camera-switch': '🔄',
      'list': '📋',
      'trending-up': '📈',
      'trending-down': '📉',
      'bar-chart': '📊',
      'pie-chart': '🥧',
      'calendar': '📅',
      'clock': '🕐',
      'target': '🎯',
      'lightbulb': '💡',
      'download': '📥',
      'credit-card': '💳',
      'users': '👥',
      'heart': '❤️',
      'activity': '📊',
      'person-add': '👤➕',
      'login': '🔐',
      'logout': '🚪',
      'inventory': '📦',
      'backup': '💾',
      'shield': '🛡️',
      'lock': '🔒',
      'unlock': '🔓',
      'key': '🔑',
      'security': '🔐',
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
