import { fireEvent, render, screen } from '@testing-library/react-native';

import StatsScreen from '../app/(tabs)/stats';
import { getPeriodRange } from '../src/lib/dates';
import { useAuthStore } from '../src/store/auth';
import { useCompletionsStore } from '../src/store/completions';
import { useHabitsStore } from '../src/store/habits';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const fetchMock = jest.fn();
const now = new Date();
const day = getPeriodRange('daily', now);
const week = getPeriodRange('weekly', now);
const month = getPeriodRange('monthly', now);

const habit = (id: string, name: string) => ({
  id,
  name,
  category: 'Misc',
  frequency: 'daily',
  targetMinutes: null,
});

const completion = (id: string, habitId: string, date: string) => ({
  id,
  habitId,
  date,
  points: 10,
});

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  useAuthStore.setState({ token: 'tok', user: null, hydrated: true });
  useHabitsStore.getState().reset();
  useCompletionsStore.getState().reset();
});

describe('StatsScreen', () => {
  it('switches between daily, weekly and monthly views', async () => {
    const responses: Record<string, unknown> = {
      [`/completions?from=${day.from}&to=${day.to}`]: {
        completions: [completion('c1', 'h1', day.from)],
      },
      [`/completions?from=${week.from}&to=${week.to}`]: {
        completions: [completion('c1', 'h1', day.from), completion('c2', 'h1', week.from)],
      },
      [`/completions?from=${month.from}&to=${month.to}`]: {
        completions: [
          completion('c1', 'h1', day.from),
          completion('c2', 'h1', week.from),
          completion('c3', 'h2', month.from),
        ],
      },
    };
    fetchMock.mockImplementation(async (url: string) => {
      const path = url.replace('http://localhost:3000', '');
      if (path === '/habits') return ok({ habits: [habit('h1', 'Read'), habit('h2', 'Run')] });
      return ok(responses[path]);
    });

    await render(<StatsScreen />);

    // Daily: 1 completion out of 2 habits * 1 day
    expect(await screen.findByText('Completion rate: 50%')).toBeTruthy();
    expect(screen.getByLabelText('Read completions').props.children).toBe(1);
    expect(screen.getByLabelText('Run completions').props.children).toBe(0);

    // Weekly: dedupe by (habit, date) is the server's job; the week has two entries for h1
    // unless today is the week start, in which case the second one is the same day.
    await fireEvent.press(screen.getByText('Weekly'));
    expect(await screen.findByText(/to/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000/completions?from=${week.from}&to=${week.to}`,
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
    expect(await screen.findByText('Completion rate: 14%')).toBeTruthy();
    expect(screen.getByLabelText('Read completions').props.children).toBe(2);

    // Monthly
    await fireEvent.press(screen.getByText('Monthly'));
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000/completions?from=${month.from}&to=${month.to}`,
      expect.anything(),
    );
    expect(await screen.findByLabelText('Run completions')).toBeTruthy();
    expect(screen.getByLabelText('Run completions').props.children).toBe(1);
  });

  it('shows load errors and handles no habits', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/habits')
        ? ok({ habits: [] })
        : { ok: false, status: 500, json: async () => ({ error: 'Internal server error' }) },
    );
    await render(<StatsScreen />);
    expect(await screen.findByText('Internal server error')).toBeTruthy();
    expect(screen.getByText('Completion rate: 0%')).toBeTruthy();
    expect(screen.getByText('No habits yet.')).toBeTruthy();
  });
});
