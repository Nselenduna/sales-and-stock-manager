# 🔧 Troubleshooting Guide

## 🚨 Common Issues and Solutions

### **Native Module Errors**

#### **Error: "Cannot find native module 'ExpoBarCodeScanner'"**

This error occurs when native modules aren't properly linked in the development environment.

**Quick Fix:**
```bash
# 1. Clear all caches
npx expo start --clear

# 2. If that doesn't work, try:
npx expo install --fix

# 3. For persistent issues:
rm -rf node_modules package-lock.json
npm install
npx expo install --fix
```

**Advanced Fix:**
```bash
# 1. Create a development build
npx expo prebuild --clean

# 2. Run on device/simulator
npx expo run:ios     # For iOS
npx expo run:android # For Android
```

**Why This Happens:**
- Native modules require proper linking in the development environment
- Expo Go doesn't support all native modules
- Development builds are needed for full native module support

#### **Error: "App entry not found"**

This is often a symptom of the native module error above.

**Solution:**
1. Follow the native module fix above
2. Check that all imports are working correctly
3. Ensure the development server is running properly

### **Permission Issues**

#### **Camera Permission Denied**

**iOS:**
- Go to Settings > Privacy & Security > Camera
- Enable camera access for the app

**Android:**
- Go to Settings > Apps > [App Name] > Permissions
- Enable camera access

**In App:**
- The app will show a permission request dialog
- Tap "Allow" when prompted

### **Development Environment Issues**

#### **Metro Cache Issues**

```bash
# Clear Metro cache
npx expo start --clear

# Or manually clear cache
rm -rf ~/.expo/cache
```

#### **Node Modules Issues**

```bash
# Remove and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npx expo install --fix
```

#### **Expo CLI Issues**

```bash
# Update Expo CLI
npm install -g @expo/cli@latest

# Clear Expo cache
npx expo install --fix
```

### **Testing Issues**

#### **Jest Configuration Problems**

If tests fail with module resolution errors:

1. **Check Jest config:**
```javascript
// jest.config.js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
},
transformIgnorePatterns: [
  'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-safe-area-context|@expo|expo|@supabase|@react-native-community|expo-image-picker|expo-media-library|expo-modules-core|expo-camera|expo-barcode-scanner|expo-haptics|@testing-library|react-native-reanimated)/)',
],
```

2. **Update mocks:**
```javascript
// __tests__/setup.js
jest.mock('expo-camera', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
}));
```

### **Performance Issues**

#### **Slow App Loading**

1. **Check bundle size:**
```bash
npx expo export --platform web
```

2. **Optimize images:**
- Use appropriate image formats (WebP for web)
- Compress images before upload
- Use lazy loading for large lists

3. **Reduce dependencies:**
- Remove unused packages
- Use tree shaking
- Consider code splitting

#### **Memory Leaks**

1. **Check for unmounted component updates:**
```javascript
useEffect(() => {
  let mounted = true;
  
  const fetchData = async () => {
    const data = await api.getData();
    if (mounted) {
      setData(data);
    }
  };
  
  fetchData();
  
  return () => {
    mounted = false;
  };
}, []);
```

2. **Clean up subscriptions:**
```javascript
useEffect(() => {
  const subscription = someService.subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### **Build Issues**

#### **iOS Build Failures**

1. **Check Xcode version compatibility**
2. **Update CocoaPods:**
```bash
cd ios && pod install
```

3. **Clear derived data:**
```bash
# In Xcode: Product > Clean Build Folder
# Or manually:
rm -rf ~/Library/Developer/Xcode/DerivedData
```

#### **Android Build Failures**

1. **Update Gradle:**
```bash
cd android && ./gradlew clean
```

2. **Check SDK versions:**
- Ensure Android SDK is up to date
- Check build.gradle for version conflicts

### **Network Issues**

#### **Supabase Connection Problems**

1. **Check environment variables:**
```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

2. **Verify Supabase configuration:**
- Check if Supabase project is active
- Verify RLS policies
- Check network connectivity

#### **Offline Mode Issues**

1. **Check AsyncStorage:**
```javascript
// Test AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const testStorage = async () => {
  try {
    await AsyncStorage.setItem('test', 'value');
    const value = await AsyncStorage.getItem('test');
    console.log('Storage working:', value);
  } catch (error) {
    console.error('Storage error:', error);
  }
};
```

### **UI/UX Issues**

#### **Layout Problems**

1. **Check SafeAreaView usage:**
```javascript
import { SafeAreaView } from 'react-native-safe-area-context';

// Use SafeAreaView for full-screen components
<SafeAreaView style={styles.container}>
  {/* Your content */}
</SafeAreaView>
```

2. **Handle different screen sizes:**
```javascript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
```

#### **Navigation Issues**

1. **Check navigation setup:**
```javascript
// Ensure NavigationContainer is at the root
<NavigationContainer>
  <Stack.Navigator>
    {/* Your screens */}
  </Stack.Navigator>
</NavigationContainer>
```

2. **Handle navigation params:**
```javascript
// Always provide default values
const { productId = '', mode = 'add' } = route.params || {};
```

### **Debugging Tips**

#### **Console Logging**

```javascript
// Use __DEV__ for development-only logs
if (__DEV__) {
  console.log('Debug info:', data);
}
```

#### **React Native Debugger**

1. Install React Native Debugger
2. Enable remote debugging in your app
3. Use the debugger to inspect state and props

#### **Performance Monitoring**

```javascript
// Use Performance API
import { PerformanceObserver } from 'react-native';

const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

observer.observe({ entryTypes: ['measure'] });
```

### **Getting Help**

#### **Useful Commands**

```bash
# Check Expo version
npx expo --version

# Check React Native version
npx react-native --version

# Check Node version
node --version

# Check npm version
npm --version

# List all dependencies
npm list --depth=0
```

#### **Resources**

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Forums](https://forums.expo.dev/)
- [React Native Community](https://github.com/react-native-community)

#### **Reporting Issues**

When reporting issues, include:
1. **Error message** (full stack trace)
2. **Environment details** (OS, Node version, Expo version)
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **Screenshots/videos** if applicable

---

**💡 Pro Tip:** Most issues can be resolved by clearing caches and reinstalling dependencies. Start with the quick fixes before trying more complex solutions. 