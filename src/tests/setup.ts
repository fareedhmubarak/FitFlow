import '@testing-library/jest-dom';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  neq: vi.fn(() => mockSupabaseClient),
  gte: vi.fn(() => mockSupabaseClient),
  lte: vi.fn(() => mockSupabaseClient),
  gt: vi.fn(() => mockSupabaseClient),
  lt: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  limit: vi.fn(() => mockSupabaseClient),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
  getCurrentGymId: vi.fn(() => Promise.resolve('test-gym-id')),
}));

vi.mock('../lib/auditLogger', () => ({
  auditLogger: {
    logPaymentCreated: vi.fn(),
    logPaymentDeleted: vi.fn(),
    logError: vi.fn(),
    logMemberCreated: vi.fn(),
    logMemberUpdated: vi.fn(),
  },
}));

// Global test utilities
export { mockSupabaseClient };
