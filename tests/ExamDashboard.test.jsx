import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ExamDashboard from '../src/ExamDashboard.jsx';

describe('ExamDashboard Auto-Logout Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (String(url).includes('/api/audit-logs')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ audit_logs: [] }),
          });
        }

        if (String(url).includes('/api/decrypt')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              content: 'CONFIDENTIAL EXAM PAPER:\n1. Example question',
            }),
          });
        }

        return Promise.reject(new Error(`Unhandled fetch call: ${String(url)}`));
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function unlockDashboard() {
    render(React.createElement(ExamDashboard, { onLogout: vi.fn() }));

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    const pinInput = screen.getByLabelText(/secure token \/ pin/i);
    fireEvent.change(pinInput, { target: { value: '4567' } });
    fireEvent.submit(pinInput.closest('form'));

    await act(async () => {
      await Promise.resolve();
    });
  }

  it('renders the initial session countdown correctly after authorization', async () => {
    await unlockDashboard();

    expect(screen.getByText(/15:00/i)).toBeInTheDocument();
  });

  it('decrements the session countdown every second', async () => {
    await unlockDashboard();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/14:59/i)).toBeInTheDocument();
  });

  it('calls onLogout when the timer reaches zero', async () => {
    const mockLogout = vi.fn();

    render(React.createElement(ExamDashboard, { onLogout: mockLogout }));

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    const pinInput = screen.getByLabelText(/secure token \/ pin/i);
    fireEvent.change(pinInput, { target: { value: '4567' } });
    fireEvent.submit(pinInput.closest('form'));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(900 * 1000);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
