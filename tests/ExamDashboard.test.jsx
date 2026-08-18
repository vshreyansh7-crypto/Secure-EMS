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
        if (String(url).includes('/api/dashboard/personnel-status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              summary: { total_admins: 2, total_supervisors: 2, total_registered_papers: 1, total_audit_events: 5 },
              admins: [
                {
                  username: 'controller_verma',
                  role: 'Master Exam Controller',
                  status: 'ONLINE',
                  ip_address: '127.0.0.1',
                  last_active: 'Just now',
                  handles: ['Master 2-Stage Key Engine', 'Question Paper Upload']
                }
              ],
              supervisors: [
                {
                  username: 'supervisor_center1',
                  center_code: 'CTR-101',
                  role: 'Head Supervisor',
                  status: 'ONLINE',
                  ip_address: '127.0.0.1',
                  last_active: 'Just now',
                  handles: ['Center CTR-101 Authorization', 'Student Monitoring']
                }
              ]
            }),
          });
        }

        if (String(url).includes('/api/audit-logs')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ audit_logs: [] }),
          });
        }

        if (String(url).includes('/api/admin/papers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ papers: [] }),
          });
        }

        if (String(url).includes('/api/supervisor/student-status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ students: [] }),
          });
        }

        if (String(url).includes('/api/scheduled-exams')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ scheduled_exams: [] }),
          });
        }

        if (String(url).includes('/api/registered-centers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ centers: [{ center_code: 'CTR-101', center_name: 'Central Exam Center' }] }),
          });
        }

        if (String(url).includes('/api/schedule-exam')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'SUCCESS',
              message: 'Exam successfully scheduled by AI Agent.',
              schedule_id: 'SCHED-CTR-101-CS602-12345',
              center_code: 'CTR-101',
              exam_date: '2026-08-25',
              subject_code: 'CS-602',
              duration_mins: 180,
              ai_clearance_token: 'AI-CLEARANCE-SCHED-123',
            }),
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

    const pinInput = screen.getByLabelText(/supervisor secure pin/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });
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

    const pinInput = screen.getByLabelText(/supervisor secure pin/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.submit(pinInput.closest('form'));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(900 * 1000);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('renders personnel monitor tab and displays admin & supervisor status cards', async () => {
    await unlockDashboard();

    const personnelTabBtn = screen.getByRole('button', { name: /PERSONNEL MONITOR/i });
    fireEvent.click(personnelTabBtn);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/SYSTEM AUTHORITY & PERSONNEL MONITOR/i)).toBeInTheDocument();
    expect(screen.getByText(/controller_verma/i)).toBeInTheDocument();
    expect(screen.getByText(/supervisor_center1/i)).toBeInTheDocument();
  });

  it('renders SCHEDULE EXAM tab, displays dynamic center dropdown, and schedules exam via AI Agent', async () => {
    await unlockDashboard();

    const scheduleTabBtn = screen.getByRole('button', { name: /SCHEDULE EXAM/i });
    fireEvent.click(scheduleTabBtn);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/AUTOMATED AI EXAM SCHEDULER & DISPATCH/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SELECT EXAM CENTER CODE \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/EXAM START TIMING \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SCHEDULE EXAM \(AI AGENT\)/i })).toBeInTheDocument();
  });
});
