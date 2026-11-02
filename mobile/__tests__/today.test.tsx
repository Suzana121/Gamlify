import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodayScreen from '../app/(tabs)/index';
import { toDateString } from '../src/lib/dates';
import { useAuthStore } from '../src/store/auth';
import { useCharacterStore } from '../src/store/character';
import { useCompletionsStore } from '../src/store/completions';
import { useHabitsStore } from '../src/store/habits';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const fetchMock = jest.fn();
const today = toDateString(new Date());
const habit = (id: string, name: string) => ({
  id,
  name,
  category: 'Misc',
  frequency: 'daily',
  targetMinutes: null,
});
const read = habit('h1', 'Read');
const run = habit('h2', 'Run');

function res(status: number, body?: unknown) {
  return {
    ok: status < 400,
    status,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
  };
}

// Route by method + path so the order of the habits/completions calls does not matter.
function serve(routes: Record<string, unknown>) {
  fetchMock.mockImplementation(async (url: string, init: { method: string }) => {
    const key = `${init.method} ${url.replace('http://localhost:3000', '')}`;
    if (!(key in routes)) throw new Error(`unexpected request ${key}`);
    return routes[key];
  });
}

const listPath = `GET /completions?from=${today}&to=${today}`;

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  useAuthStore.setState({ token: 'tok', user: null, hydrated: true });
  useHabitsStore.getState().reset();
  useCompletionsStore.getState().reset();
  useCharacterStore.getState().reset();
});

describe('TodayScreen', () => {
  it('lists habits with the done-today summary', async () => {
    serve({
      'GET /habits': res(200, { habits: [read, run] }),
      [listPath]: res(200, {
        completions: [{ id: 'c1', habitId: 'h1', date: today, points: 10 }],
      }),
    });
    await render(<TodayScreen />);
    expect(await screen.findByText('1 of 2 done today')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Read', checked: true })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Run', checked: false })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000/completions?from=${today}&to=${today}`,
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('checks a habit optimistically and posts the completion', async () => {
    serve({
      'GET /habits': res(200, { habits: [read] }),
      [listPath]: res(200, { completions: [] }),
      'POST /habits/h1/completions': res(201, {
        completion: { id: 'c1', habitId: 'h1', date: today, points: 10 },
      }),
    });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByLabelText('Read'));
    expect(await screen.findByText('1 of 1 done today')).toBeTruthy();
    const call = fetchMock.mock.calls.find(([, init]) => init.method === 'POST');
    expect(call?.[0]).toBe('http://localhost:3000/habits/h1/completions');
    expect(JSON.parse(call?.[1].body)).toEqual({ date: today });
    await waitFor(() =>
      expect(useCompletionsStore.getState().completions).toEqual([
        { id: 'c1', habitId: 'h1', date: today, points: 10 },
      ]),
    );
  });

  it('refreshes the character after a successful toggle', async () => {
    const character = {
      xp: 10,
      level: 1,
      xpIntoLevel: 10,
      xpForNextLevel: 100,
      stage: 1,
      currentStreak: 1,
      longestStreak: 1,
    };
    serve({
      'GET /habits': res(200, { habits: [read] }),
      [listPath]: res(200, { completions: [] }),
      'POST /habits/h1/completions': res(201, {
        completion: { id: 'c1', habitId: 'h1', date: today, points: 10 },
      }),
      'GET /character': res(200, { character }),
    });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByLabelText('Read'));
    await waitFor(() => expect(useCharacterStore.getState().character).toEqual(character));
  });

  it('does not refresh the character when the toggle fails', async () => {
    serve({
      'GET /habits': res(200, { habits: [read] }),
      [listPath]: res(200, { completions: [] }),
      'POST /habits/h1/completions': res(500, { error: 'Internal server error' }),
    });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByLabelText('Read'));
    await screen.findByText('Internal server error');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/character'))).toBe(false);
  });

  it('unchecks a completed habit with DELETE', async () => {
    serve({
      'GET /habits': res(200, { habits: [read] }),
      [listPath]: res(200, {
        completions: [{ id: 'c1', habitId: 'h1', date: today, points: 10 }],
      }),
      [`DELETE /habits/h1/completions/${today}`]: res(204),
    });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Read', checked: true }));
    expect(await screen.findByText('0 of 1 done today')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000/habits/h1/completions/${today}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('rolls back a failed check and shows the error', async () => {
    serve({
      'GET /habits': res(200, { habits: [read] }),
      [listPath]: res(200, { completions: [] }),
      'POST /habits/h1/completions': res(500, { error: 'Internal server error' }),
    });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByLabelText('Read'));
    expect(await screen.findByText('Internal server error')).toBeTruthy();
    expect(screen.getByText('0 of 1 done today')).toBeTruthy();
    expect(useCompletionsStore.getState().completions).toEqual([]);
  });

  it('rolls back a failed uncheck', async () => {
    const c1 = { id: 'c1', habitId: 'h1', date: today, points: 10 };
    serve({
      'GET /habits': res(200, { habits: [read] }),
      [listPath]: res(200, { completions: [c1] }),
      [`DELETE /habits/h1/completions/${today}`]: res(500, { error: 'Internal server error' }),
    });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Read', checked: true }));
    expect(await screen.findByText('Internal server error')).toBeTruthy();
    expect(screen.getByText('1 of 1 done today')).toBeTruthy();
  });

  it('keeps the habit checked when the server says it was already completed', async () => {
    const c1 = { id: 'c1', habitId: 'h1', date: today, points: 10 };
    let listCalls = 0;
    fetchMock.mockImplementation(async (url: string, init: { method: string }) => {
      if (url.endsWith('/habits')) return res(200, { habits: [read] });
      if (init.method === 'POST') return res(409, { error: 'Already completed' });
      return res(200, { completions: listCalls++ === 0 ? [] : [c1] });
    });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByLabelText('Read'));
    expect(await screen.findByText('1 of 1 done today')).toBeTruthy();
    expect(screen.queryByText('Already completed')).toBeNull();
  });

  it('shows an empty state', async () => {
    serve({ 'GET /habits': res(200, { habits: [] }), [listPath]: res(200, { completions: [] }) });
    await render(<TodayScreen />);
    expect(await screen.findByText(/No habits yet/)).toBeTruthy();
    expect(screen.getByText('0 of 0 done today')).toBeTruthy();
  });

  it('clears completions on logout', async () => {
    serve({
      'GET /habits': res(200, { habits: [read] }),
      [listPath]: res(200, {
        completions: [{ id: 'c1', habitId: 'h1', date: today, points: 10 }],
      }),
    });
    await render(<TodayScreen />);
    await screen.findByText('1 of 1 done today');
    useAuthStore.setState({ token: null });
    await waitFor(() => expect(useCompletionsStore.getState().completions).toEqual([]));
  });
});
