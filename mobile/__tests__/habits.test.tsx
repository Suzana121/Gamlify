import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import HabitsScreen from '../app/(tabs)/habits';
import { useAuthStore } from '../src/store/auth';
import { useHabitsStore } from '../src/store/habits';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const fetchMock = jest.fn();
const read = {
  id: 'h1',
  name: 'Read',
  category: 'Learning',
  frequency: 'daily',
  targetMinutes: 20,
};

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
}

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  useAuthStore.setState({ token: 'tok', user: null, hydrated: true });
  useHabitsStore.getState().reset();
});

describe('HabitsScreen', () => {
  it('lists habits using the auth token', async () => {
    reply(200, { habits: [read] });
    await render(<HabitsScreen />);
    expect(await screen.findByText('Read')).toBeTruthy();
    expect(screen.getByText('Learning · daily · 20 min')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/habits',
      expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('shows an empty state and load errors', async () => {
    reply(200, { habits: [] });
    await render(<HabitsScreen />);
    expect(await screen.findByText(/No habits yet/)).toBeTruthy();

    reply(500, { error: 'Internal server error' });
    await useHabitsStore.getState().load();
    expect(await screen.findByText('Internal server error')).toBeTruthy();
  });

  it('adds a habit', async () => {
    reply(200, { habits: [] });
    await render(<HabitsScreen />);
    await fireEvent.press(await screen.findByText('Add habit'));

    reply(201, {
      habit: {
        id: 'h2',
        name: 'Run',
        category: 'Health',
        targetMinutes: null,
        frequency: 'weekly',
      },
    });
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), ' Run ');
    await fireEvent.changeText(screen.getByPlaceholderText('Category'), 'Health');
    await fireEvent.press(screen.getByText('Weekly'));
    await fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText('Health · weekly')).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://localhost:3000/habits');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Run',
      category: 'Health',
      frequency: 'weekly',
      targetMinutes: null,
    });
  });

  it('validates the form before calling the API', async () => {
    reply(200, { habits: [] });
    await render(<HabitsScreen />);
    await fireEvent.press(await screen.findByText('Add habit'));
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('Name and category are required')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Run');
    await fireEvent.changeText(screen.getByPlaceholderText('Category'), 'Health');
    await fireEvent.changeText(screen.getByPlaceholderText('Target minutes (optional)'), '0');
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText(/positive whole number/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows server errors in the form and stays on it', async () => {
    reply(200, { habits: [] });
    await render(<HabitsScreen />);
    await fireEvent.press(await screen.findByText('Add habit'));
    reply(400, { error: 'Invalid habit' });
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Run');
    await fireEvent.changeText(screen.getByPlaceholderText('Category'), 'Health');
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('Invalid habit')).toBeTruthy();
    expect(screen.getByPlaceholderText('Name')).toBeTruthy();
  });

  it('edits a habit', async () => {
    reply(200, { habits: [read] });
    await render(<HabitsScreen />);
    await fireEvent.press(await screen.findByLabelText('Edit Read'));
    expect(screen.getByDisplayValue('Read')).toBeTruthy();

    reply(200, { habit: { ...read, name: 'Study' } });
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Study');
    await fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText('Study')).toBeTruthy();
    expect(screen.queryByText('Read')).toBeNull();
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://localhost:3000/habits/h1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toMatchObject({ name: 'Study', targetMinutes: 20 });
  });

  it('deletes a habit', async () => {
    reply(200, { habits: [read] });
    await render(<HabitsScreen />);
    const deleteButton = await screen.findByLabelText('Delete Read');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('no body');
      },
    });
    await fireEvent.press(deleteButton);
    await waitFor(() => expect(screen.queryByText('Read')).toBeNull());
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:3000/habits/h1');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });

  it('clears habits on logout', async () => {
    reply(200, { habits: [read] });
    await render(<HabitsScreen />);
    await screen.findByText('Read');
    useAuthStore.setState({ token: null });
    await waitFor(() => expect(useHabitsStore.getState().habits).toEqual([]));
  });
});
