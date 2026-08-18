import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VerificationTerminal from '../src/VerificationTerminal.jsx';

describe('VerificationTerminal Component', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (String(url).includes('/api/verify-student')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'VERIFIED',
              verified: true,
              roll_number: '2026-CS-101',
              seat_id: 'DESK-42',
              center_code: 'CTR-101',
              facial_match_confidence: 98.4,
              enrollment_db_status: 'MATCHED',
              clearance_token: 'HALL-PASS-2026-CS-101-TEST',
              message: 'Student 2026-CS-101 verified & cleared.',
              timestamp: '2026-08-18T10:00:00Z',
            }),
          });
        }
        return Promise.reject(new Error(`Unhandled fetch call: ${String(url)}`));
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders student verification header, inputs, and photo capture section', async () => {
    await act(async () => {
      render(React.createElement(VerificationTerminal));
    });

    expect(screen.getByText(/STUDENT PRE-EXAM VERIFICATION TERMINAL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/student roll number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RUN CANDIDATE VERIFICATION/i })).toBeInTheDocument();
  });

  it('handles simulated camera capture and submits student verification', async () => {
    await act(async () => {
      render(React.createElement(VerificationTerminal));
    });

    const simulateBtn = screen.getByRole('button', { name: /SIMULATE CAPTURE/i });
    fireEvent.click(simulateBtn);

    expect(screen.getByText(/SNAPSHOT CAPTURED/i)).toBeInTheDocument();

    const verifyBtn = screen.getByRole('button', { name: /RUN CANDIDATE VERIFICATION/i });

    await act(async () => {
      fireEvent.click(verifyBtn);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText(/CANDIDATE ENTRY CLEARED & VERIFIED/i)).toBeInTheDocument();
      expect(screen.getByText(/HALL-PASS-2026-CS-101-TEST/i)).toBeInTheDocument();
    });
  });
});
