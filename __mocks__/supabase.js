// Mock Supabase client for testing
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    signUp: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user', email: 'test@example.com' } }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
    gt: jest.fn(() => Promise.resolve({ data: [], error: null })),
    lt: jest.fn(() => Promise.resolve({ data: [], error: null })),
    gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
    lte: jest.fn(() => Promise.resolve({ data: [], error: null })),
    like: jest.fn(() => Promise.resolve({ data: [], error: null })),
    ilike: jest.fn(() => Promise.resolve({ data: [], error: null })),
    in: jest.fn(() => Promise.resolve({ data: [], error: null })),
    not: jest.fn(() => Promise.resolve({ data: [], error: null })),
    or: jest.fn(() => Promise.resolve({ data: [], error: null })),
    and: jest.fn(() => Promise.resolve({ data: [], error: null })),
    limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
    range: jest.fn(() => Promise.resolve({ data: [], error: null })),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: { path: 'mock-path' }, error: null })),
      download: jest.fn(() => Promise.resolve({ data: null, error: null })),
      remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } })),
    })),
  },
};

module.exports = {
  supabase: mockSupabase,
  createClient: jest.fn(() => mockSupabase),
}; 