import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdminTerminal from '../src/AdminTerminal.jsx';

describe('AdminTerminal Component', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (String(url).includes('/api/admin/papers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              papers: [
                {
                  paper_id: 1,
                  subject_code: 'CS-602',
                  encrypted_file_path: 'cs-602_encrypted.enc',
                  scheduled_unlock_time: '2026-08-12 15:00:00',
                  created_at: '2026-08-12 12:00:00',
                },
              ],
            }),
          });
        }

        if (String(url).includes('/api/audit-logs')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ audit_logs: [] }),
          });
        }

        if (String(url).includes('/api/admin/upload-paper')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              message: 'Question paper encrypted with 2-stage split authority locks.',
              subject_code: 'MATH-201',
              scheduled_unlock_time: '2026-08-12 15:05:00',
              admin_key: 'CTRL-KEY-TEST-999',
              supervisor_key: '246810',
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

  it('renders admin terminal header and paper upload form', async () => {
    await act(async () => {
      render(React.createElement(AdminTerminal));
    });

    expect(screen.getByText(/CENTRAL ADMIN TERMINAL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject code/i)).toBeInTheDocument();
  });

  it('submits paper upload and renders generated split keys', async () => {
    await act(async () => {
      render(React.createElement(AdminTerminal));
    });

    const submitBtn = screen.getByRole('button', { name: /ENCRYPT & REGISTER QUESTION PAPER/i });
    
    await act(async () => {
      fireEvent.click(submitBtn);
      await Promise.resolve();
    });

    expect(screen.getByText(/Question paper encrypted with 2-stage split authority locks/i)).toBeInTheDocument();
    expect(screen.getByText(/CTRL-KEY-TEST-999/i)).toBeInTheDocument();
  });
});
