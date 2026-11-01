import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import type { Habit } from '../src/api/client';
import { useAuthStore } from '../src/store/auth';
import { useHabitsStore } from '../src/store/habits';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const store = SecureStore as jest.Mocked<typeof SecureStore>;
const user = { id: '1', email: 'a@b.co', displayName: 'Ada' };
const run: Habit = {
  id: 'h1',
  name: 'Run',
  category: 'sport',
  frequency: 'daily',
  targetMinutes: 30,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const fetchMock = jest.fn();

type Call = { method: string; path: string; body: unknown; auth: string | undefined };
let calls: Call[];
let serverHabits: Habit[];
let nextError: { status: number; error: string } | null;

function json(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

function fakeServer(url: string, init: RequestInit & { headers: Record<string, string> }) {
  const path = url.replace('http://localhost:3000', '');
  const method = init.method ?? 'GET';
  const body = init.body ? JSON.parse(init.body as string) : undefined;
  calls.push({ method, path, body, auth: init.headers.Authorization });

  if (path === '/me') return json(200, { user });
  if (nextError && method !== 'GET') {
    const e = nextError;
    nextError = null;
    return json(e.status, { error: e.error });
  }
  if (path === '/habits' && method === 'GET') return json(200, { habits: serverHabits });
  if (path === '/habits' && method === 'POST') {
    const habit: Habit = {
      id: 'new',
      targetMinutes: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      ...body,
    };
    serverHabits = [...serverHabits, habit];
    return json(201, { habit });
  }
  const id = path.split('/')[2];
  if (method === 'PATCH') {
    const habit = { ...serverHabits.find((h) => h.id === id)!, ...body };
    serverHabits = serverHabits.map((h) => (h.id === id ? habit : h));
    return json(200, { habit });
  }
  if (method === 'DELETE') {
    serverHabits = serverHabits.filter((h) => h.id !== id);
    return { ok: true, status: 204, json: async () => Promise.reject(new Error('no body')) };
  }
  return json(404, { error: 'not found' });
}

const habitCalls = () => calls.filter((c) => c.path.startsWith('/habits') && c.method !== 'GET');

async function renderHabits() {
  await renderRouter('./app', { initialUrl: '/habits' });
  await screen.findByText('Add habit');
}

beforeEach(() => {
  jest.resetAllMocks();
  calls = [];
  serverHabits = [run];
  nextError = null;
  fetchMock.mockImplementation(async (url, init) => fakeServer(url, init));
  global.fetch = fetchMock as unknown as typeof fetch;
  useAuthStore.setState({ token: null, user: null, hydrated: false });
  useHabitsStore.getState().reset();
  store.getItemAsync.mockResolvedValue('tok');
});

describe('habits', () => {
  it('lists the user habits with the bearer token', async () => {
    await renderHabits();
    expect(await screen.findByText('Run')).toBeTruthy();
    expect(screen.getByText(/sport · daily · 30 min/)).toBeTruthy();
    expect(calls.find((c) => c.path === '/habits')?.auth).toBe('Bearer tok');
  });

  it('shows the empty state', async () => {
    serverHabits = [];
    await renderHabits();
    expect(await screen.findByText('No habits yet. Add your first one!')).toBeTruthy();
  });

  it('refreshes on pull-to-refresh', async () => {
    await renderHabits();
    await screen.findByText('Run');
    serverHabits = [run, { ...run, id: 'h2', name: 'Read', category: 'study' }];
    await act(async () => {
      await screen.getByTestId('habits-list').props.refreshControl.props.onRefresh();
    });
    expect(await screen.findByText('Read')).toBeTruthy();
  });

  it('adds a habit using a suggestion chip', async () => {
    serverHabits = [];
    await renderHabits();
    await fireEvent.press(await screen.findByText('Add habit'));
    await fireEvent.changeText(await screen.findByPlaceholderText('Name'), 'Sleep early');
    await fireEvent.press(screen.getByText('sleep'));
    await fireEvent.press(screen.getByText('weekly'));
    await fireEvent.changeText(screen.getByPlaceholderText('Target minutes (optional)'), '45');
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen).toHavePathname('/habits'));
    expect(await screen.findByText('Sleep early')).toBeTruthy();
    expect(habitCalls()).toEqual([
      expect.objectContaining({
        method: 'POST',
        path: '/habits',
        body: { name: 'Sleep early', category: 'sleep', frequency: 'weekly', targetMinutes: 45 },
        auth: 'Bearer tok',
      }),
    ]);
  });

  it('edits a habit', async () => {
    await renderHabits();
    await fireEvent.press(await screen.findByLabelText('Edit Run'));
    const name = await screen.findByPlaceholderText('Name');
    expect(name.props.value).toBe('Run');
    await fireEvent.changeText(name, 'Run fast');
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen).toHavePathname('/habits'));
    expect(await screen.findByText('Run fast')).toBeTruthy();
    expect(habitCalls()[0]).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        path: '/habits/h1',
        body: { name: 'Run fast', category: 'sport', frequency: 'daily', targetMinutes: 30 },
      }),
    );
  });

  it('deletes a habit after confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderHabits();
    await fireEvent.press(await screen.findByLabelText('Edit Run'));
    await fireEvent.press(await screen.findByText('Delete habit'));

    expect(alert).toHaveBeenCalled();
    expect(habitCalls()).toHaveLength(0);
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find((b) => b.text === 'Delete')!.onPress!();
    });

    await waitFor(() => expect(screen).toHavePathname('/habits'));
    expect(await screen.findByText('No habits yet. Add your first one!')).toBeTruthy();
    expect(habitCalls()[0]).toEqual(
      expect.objectContaining({ method: 'DELETE', path: '/habits/h1' }),
    );
  });

  it('shows client-side validation without calling the API', async () => {
    await renderHabits();
    await fireEvent.press(await screen.findByText('Add habit'));
    await fireEvent.press(await screen.findByText('Save'));
    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(habitCalls()).toHaveLength(0);
  });

  it('shows the server validation error', async () => {
    await renderHabits();
    await fireEvent.press(await screen.findByText('Add habit'));
    await fireEvent.changeText(await screen.findByPlaceholderText('Name'), 'X');
    await fireEvent.changeText(screen.getByPlaceholderText('Category'), 'misc');
    nextError = { status: 400, error: 'name must be at least 2 characters' };
    await fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText('name must be at least 2 characters')).toBeTruthy();
    expect(screen).toHavePathname('/habit-form');
  });
});
