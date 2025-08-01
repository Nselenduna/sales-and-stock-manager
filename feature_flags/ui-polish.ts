export const uiPolishEnabled = true;

// Individual feature flags for granular control
export const uiPolishFlags = {
  skeletonLoaders: true,
  smoothAnimations: true,
  safeAreaInsets: true,
} as const;

// Helper function to check if a specific polish feature is enabled
export const isUIPolishEnabled = (
  feature: keyof typeof uiPolishFlags
): boolean => {
  return uiPolishEnabled && uiPolishFlags[feature];
};
