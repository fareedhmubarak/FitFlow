import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { renderTemplate, reminderVars, DEFAULT_TEMPLATES } from '@/lib/messageTemplates';

describe('renderTemplate', () => {
  it('fills placeholders in a gym-customised welcome message', () => {
    const tpl = '🏋️‍♂️ Welcome to Avengers Fitness Club! 💪\nHello {member_name} welcome! 🎉\nGym: {gym_name}';
    expect(renderTemplate(tpl, { member_name: 'Sasi', gym_name: 'Avengers Gym' })).toBe(
      '🏋️‍♂️ Welcome to Avengers Fitness Club! 💪\nHello Sasi welcome! 🎉\nGym: Avengers Gym',
    );
  });

  it('supports {{double}} braces and is case-insensitive', () => {
    expect(renderTemplate('Hi {{Member_Name}}', { member_name: 'Ravi' })).toBe('Hi Ravi');
  });

  it('leaves unknown {tokens} untouched and blanks missing known ones', () => {
    expect(renderTemplate('{foo} {plan}!', {})).toBe('{foo} !');
  });

  it('default templates render without leftover placeholders', () => {
    for (const tpl of Object.values(DEFAULT_TEMPLATES)) {
      const out = renderTemplate(tpl, {
        member_name: 'A', gym_name: 'G', plan: 'P', amount: '₹1', joining_date: 'd',
        payment_date: 'd', payment_method: 'UPI', valid_until: 'd', due_date: 'd',
        days_overdue: 1, due_status: 'is due',
      });
      expect(out).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});

describe('reminderVars', () => {
  it('describes overdue, today and future due dates', () => {
    const d = (offset: number) => {
      const x = new Date();
      x.setDate(x.getDate() + offset);
      return x;
    };
    expect(reminderVars(d(-3)).due_status).toContain('3 day(s) overdue');
    expect(reminderVars(d(-3)).days_overdue).toBe(3);
    expect(reminderVars(d(0)).due_status).toContain('today');
    expect(reminderVars(d(5)).due_status).toContain('due on');
  });
});
