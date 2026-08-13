import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SupervisorTerminal from '../src/SupervisorTerminal.jsx';

describe('SupervisorTerminal Component', () => {
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

        if (String(url).includes('/api/supervisor/student-status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ students: [] }),
          });
        }

        if (String(url).includes('/api/decrypt')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              content: 'CONFIDENTIAL EXAM PAPER:\n1. Solve integral',
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

  it('renders time-lock countdown initially and unlocks form after 10s', async () => {
    render(React.createElement(SupervisorTerminal));

    expect(screen.getByText(/TIME-LOCK RELEASE ENCLAVE ACTIVE/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText(/Dual-Key Multi-Party Authorization Required/i)).toBeInTheDocument();
  });

  it('decrypts paper upon submitting dual keys', async () => {
    render(React.createElement(SupervisorTerminal));

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    const pinInput = screen.getByLabelText(/supervisor cryptographic pin/i);
    fireEvent.change(pinInput, { target: { value: '246810' } });
    fireEvent.submit(pinInput.closest('form'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/CONFIDENTIAL EXAM PAPER:/i)).toBeInTheDocument();
    expect(screen.getByText(/FORENSIC WATERMARK:/i)).toBeInTheDocument();
  });
});
