import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CenterRegistrationTerminal from '../src/CenterRegistrationTerminal.jsx';

describe('CenterRegistrationTerminal Component', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (String(url).includes('/api/registered-centers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ centers: [] }),
          });
        }

        if (String(url).includes('/api/register-center')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'SUCCESS',
              message: "Exam Center 'NIT Center A' (CTR-105) successfully registered.",
              center_code: 'CTR-105',
              center_name: 'NIT Center A',
              address: 'Campus Grounds, Delhi',
              contact_number: '+91 98765 43210',
              email: 'center.head@nit.edu.in',
              accreditation_status: 'ACCREDITED',
              certificate_token: 'CERT-CTR-105-12345678',
              timestamp: '2026-08-18T12:00:00Z',
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

  it('renders registration portal header, inputs, and form controls', async () => {
    await act(async () => {
      render(React.createElement(CenterRegistrationTerminal));
    });

    expect(screen.getByText(/OFFICIAL EXAM CENTER REGISTRATION PORTAL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/EXAM CENTER CODE \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/EXAM CENTER NAME \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /REGISTER EXAM CENTER/i })).toBeInTheDocument();
  });

  it('submits center registration form and displays accreditation certificate', async () => {
    await act(async () => {
      render(React.createElement(CenterRegistrationTerminal));
    });

    fireEvent.change(screen.getByLabelText(/EXAM CENTER CODE \*/i), { target: { value: 'CTR-105' } });
    fireEvent.change(screen.getByLabelText(/EXAM CENTER NAME \*/i), { target: { value: 'NIT Center A' } });
    fireEvent.change(screen.getByLabelText(/OFFICIAL CONTACT NUMBER \*/i), { target: { value: '+91 98765 43210' } });
    fireEvent.change(screen.getByLabelText(/OFFICIAL EMAIL ADDRESS \*/i), { target: { value: 'center.head@nit.edu.in' } });
    fireEvent.change(screen.getByLabelText(/FULL INSTITUTIONAL POSTAL ADDRESS \*/i), { target: { value: 'Campus Grounds, Delhi' } });

    const submitBtn = screen.getByRole('button', { name: /REGISTER EXAM CENTER/i });

    await act(async () => {
      fireEvent.click(submitBtn);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText(/EXAMINATION CENTER SUCCESSFULLY ACCREDITED/i)).toBeInTheDocument();
      expect(screen.getByText(/CERT-CTR-105-12345678/i)).toBeInTheDocument();
    });
  });
});
