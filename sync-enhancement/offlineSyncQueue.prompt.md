## Module: Enhanced Offline Sync Queue

### Objective
Implement queueing and conflict resolution for offline inventory/sales actions.

### Scope
- Local queue for create/update actions
- Retry logic with exponential backoff
- Data version tags for Supabase merge logic
- User feedback: sync bar, error toasts
- Sync logs stored with timestamp and user_id

### Acceptance
- ✅ Sync resumes after disconnection
- ✅ Conflict resolution handles dual edits
- ✅ UI updates reflect sync state

