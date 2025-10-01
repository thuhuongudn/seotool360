import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import AdminTokenLogsPage from '../src/pages/admin-token-logs';

const mockUseRequireAdmin = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('../src/hooks/use-require-admin', () => ({
  useRequireAdmin: () => mockUseRequireAdmin(),
}));

vi.mock('@tanstack/react-query', async () => {
  return {
    useQuery: (options: any) => mockUseQuery(options),
  };
});

describe('AdminTokenLogsPage access control', () => {
  beforeEach(() => {
    mockUseRequireAdmin.mockReset();
    mockUseQuery.mockReset();
  });

  it('renders admin dashboard details when user is admin', () => {
    mockUseRequireAdmin.mockReturnValue({
      profile: { role: 'admin' },
      isLoading: false,
      isAdmin: true,
      isDenied: false,
      isError: false,
      error: null,
      refreshProfile: vi.fn(),
    });

    mockUseQuery.mockImplementation((options: any) => {
      const key = Array.isArray(options?.queryKey) ? options.queryKey[0] : options?.queryKey;

      if (key === '/api/admin/users?limit=200') {
        return {
          data: {
            profiles: [
              { userId: 'user-1', username: 'alice', role: 'member', isActive: true },
            ],
            total: 1,
          },
          isLoading: false,
          refetch: vi.fn(),
        };
      }

      if (key === '/api/admin/seo-tools') {
        return {
          data: [
            { id: 'tool-1', name: 'tool-one', title: 'Tool One' },
          ],
          isLoading: false,
          refetch: vi.fn(),
        };
      }

      if (key === 'token-usage-logs') {
        return {
          data: {
            data: [
              {
                id: 'log-1',
                user_id: 'user-1',
                tool_id: 'tool-1',
                consumed: 10,
                created_at: new Date().toISOString(),
                username: 'alice',
                tool_name: 'tool-1',
                tool_title: 'Tool 1',
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          },
          isLoading: false,
          refetch: vi.fn(),
        };
      }

      if (key === 'token-usage-stats') {
        return {
          data: {
            stats: {
              total: {
                total_requests: 1,
                total_tokens_consumed: 10,
                unique_users: 1,
                unique_tools: 1,
              },
              top_users: [],
              top_tools: [],
            },
          },
          isLoading: false,
          refetch: vi.fn(),
        };
      }

      return { data: null, isLoading: false, refetch: vi.fn() };
    });

    const html = renderToString(<AdminTokenLogsPage />);

    expect(html).toContain('Token Usage Logs');
    expect(mockUseQuery).toHaveBeenCalledTimes(4);
  });

  it('shows access denied for non-admin profile', () => {
    mockUseRequireAdmin.mockReturnValue({
      profile: { role: 'member' },
      isLoading: false,
      isAdmin: false,
      isDenied: true,
      isError: false,
      error: null,
      refreshProfile: vi.fn(),
    });

    mockUseQuery.mockImplementation(() => ({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    const html = renderToString(<AdminTokenLogsPage />);

    expect(html).toContain('Access denied. Admin privileges required.');
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('renders loading state while profile is resolving', () => {
    mockUseRequireAdmin.mockReturnValue({
      profile: null,
      isLoading: true,
      isAdmin: false,
      isDenied: false,
      isError: false,
      error: null,
      refreshProfile: vi.fn(),
    });

    mockUseQuery.mockImplementation(() => ({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    const html = renderToString(<AdminTokenLogsPage />);

    expect(html).toContain('animate-spin');
    expect(mockUseQuery).toHaveBeenCalled();
  });
});
