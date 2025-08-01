# Lazy Image Rendering for Product Thumbnails

## Objective
Prevent memory spikes from simultaneous image loads in list views.

## Setup
- Add visibility check per card
- Use conditional rendering inside `ProductCard.tsx`

## Implementation
- Use `Image` with visibility toggle
- Show placeholder on slow or offline load
- Fallback: blank state with alt text

## Testing
- List view with 100+ items
- Simulated low bandwidth

## Accessibility
- Alt text always included
- Avoid blinking/flickering images

## Compliance
- Images stored offline via filesystem
- Respect user data quotas

## Performance Improvements
- **Before:** All images load simultaneously
- **After:** Only visible images load
- **Expected:** 40%+ reduction in memory usage 