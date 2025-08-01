#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up development environment...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

try {
  // Clear node_modules and reinstall
  console.log('📦 Clearing node_modules and reinstalling dependencies...');
  if (fs.existsSync('node_modules')) {
    execSync('rm -rf node_modules', { stdio: 'inherit' });
  }
  execSync('npm install', { stdio: 'inherit' });

  // Clear Expo cache
  console.log('\n🗑️  Clearing Expo cache...');
  execSync('npx expo install --fix', { stdio: 'inherit' });

  // Clear Metro cache
  console.log('\n🚇 Clearing Metro cache...');
  execSync('npx expo start --clear', { stdio: 'inherit' });

  console.log('\n✅ Development environment setup complete!');
  console.log('\n📱 Next steps:');
  console.log('1. Restart your development server: npx expo start');
  console.log('2. If using iOS simulator, run: npx expo run:ios');
  console.log('3. If using Android emulator, run: npx expo run:android');
  console.log('\n💡 If you still see native module errors:');
  console.log('- Try running: npx expo prebuild --clean');
  console.log('- Then: npx expo run:ios (or run:android)');
} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.log('\n🔧 Manual steps to try:');
  console.log('1. Delete node_modules folder');
  console.log('2. Delete package-lock.json');
  console.log('3. Run: npm install');
  console.log('4. Run: npx expo install --fix');
  console.log('5. Run: npx expo start --clear');
  process.exit(1);
}
