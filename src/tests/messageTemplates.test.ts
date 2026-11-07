import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { buildMessage, renderTemplate, reminderVars, DEFAULT_BODIES, prettyPlan } from '@/lib/messageTemplates';

const GYM_TEXT =
  '🏋️‍♂️ Welcome to Avengers Fitness Club! 💪\n' +
  'Thank you for becoming a member of Avengers Fitness Club.\n' +
  'Welcome to the Avengers family! ❤️';

describe('buildMessage (owner writes plain text, app adds the rest)', () => {
  it('adds member name and membership details around the gym text', () => {
    const msg = buildMessage('welcome', GYM_TEXT, {
      member_name: 'Sasi', plan: '3 Months', amount: '₹2,500', joining_date: '07 Nov 2026', valid_until: '06 Feb 2027',
    });
    expect(msg.startsWith('Hi *Sasi*! 🎉\n\n🏋️‍♂️ Welcome to Avengers Fitness Club!')).toBe(true);
    expect(msg).toContain('📋 *Membership Details*\nPlan: 3 Months\nAmount Paid: ₹2,500\nStart Date: 07 Nov 2026\nValid Until: 06 Feb 2027');
    expect(msg.indexOf('Welcome to the Avengers family')).toBeLessThan(msg.indexOf('Membership Details'));
  });

  it('skips empty detail rows', () => {
    const msg = buildMessage('welcome', 'Hello', { member_name: 'A', plan: 'Monthly' });
    expect(msg).toBe('Hi *A*! 🎉\n\nHello\n\n📋 *Membership Details*\nPlan: Monthly');
  });

  it('reminder shows amount, due date and status', () => {
    const msg = buildMessage('reminder', 'Please pay.', { member_name: 'R', amount: '₹1,000', due_date: '05 Nov 2026', due_status: '2 day(s) overdue' });
    expect(msg).toContain('Amount Due: ₹1,000\nDue Date: 05 Nov 2026\nStatus: 2 day(s) overdue');
  });

  it('appends an extra note (e.g. late payment) at the end', () => {
    expect(buildMessage('renewal', 'Thanks', { member_name: 'R' }, 'Note: late').endsWith('Note: late')).toBe(true);
  });

  it('still supports older texts that contain {member_name} (no double greeting)', () => {
    const msg = buildMessage('welcome', 'Hello {member_name}!', { member_name: 'Sasi' });
    expect(msg.startsWith('Hello Sasi!')).toBe(true);
    expect(msg).not.toContain('Hi *Sasi*');
  });

  it('defaults mention the gym name and contain no codes', () => {
    for (const fn of Object.values(DEFAULT_BODIES)) {
      const body = fn('Avengers Gym');
      expect(body).toContain('Avengers Gym');
      expect(body).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});

describe('helpers', () => {
  it('renderTemplate leaves unknown {tokens} untouched', () => {
    expect(renderTemplate('{foo} {plan}!', {})).toBe('{foo} !');
  });

  it('prettyPlan maps stored plan codes', () => {
    expect(prettyPlan('quarterly')).toBe('3 Months');
    expect(prettyPlan('1 Year + 8 Months')).toBe('1 Year + 8 Months');
  });

  it('reminderVars describes overdue, today and upcoming', () => {
    const d = (offset: number) => { const x = new Date(); x.setDate(x.getDate() + offset); return x; };
    expect(reminderVars(d(-3))).toMatchObject({ days_overdue: 3, due_status: '3 day(s) overdue' });
    expect(reminderVars(d(0)).due_status).toBe('Due today');
    expect(reminderVars(d(5)).due_status).toBe('Due in 5 day(s)');
  });
});
