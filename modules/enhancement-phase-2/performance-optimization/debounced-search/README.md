# Debounced Product Search

## Objective
Delay filtering until user stops typing to improve performance and clarity.

## Setup
- Add `useDebounce.ts` in `hooks/`
- Use inside `SearchComponent.tsx`

## Implementation
- Debounce at 300–500ms
- Cancel previous trigger
- Show loading indicator during delay

## Testing
- Fast typing vs slow input simulation
- Confirm filter only fires once post-delay

## Accessibility
- Loading spinner must meet contrast standards
- Error message readable via screen reader

## Compliance
- Search queries never sent to server unless explicitly triggered

## Performance Improvements
- **Before:** Filter triggered on every keystroke
- **After:** Filter triggered only after user stops typing for 300ms
- **Expected:** Reduced CPU usage and smoother UX 