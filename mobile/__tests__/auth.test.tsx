import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEY, useAuthStore } from '../src/store/auth';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const store = SecureStore as jest.Mocked<typeof SecureStore>;
const user = { id: '1', email: 'a@b.co', displayName: 'Ada' };
const fetchMock = jest.fn();

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
}

function renderApp(initialUrl = '/') {
  return renderRouter('./app', { initialUrl });
}

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  useAuthStore.setState({ token: null, user: null, hydrated: false });
  store.getItemAsync.mockResolvedValue(null);
});

describe('auth', () => {
  it('redirects unauthenticated users to login', async () => {
    await renderApp('/character');
    expect(await screen.findByPlaceholderText('Email')).toBeTruthy();
    expect(screen).toHavePathname('/login');
  });

  it('redirects authenticated users to tabs', async () => {
    store.getItemAsync.mockResolvedValue('tok');
    reply(200, { user });
    await renderApp('/login');
    expect((await screen.findAllByText('Today')).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/me',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('logs in successfully, persists token and shows tabs', async () => {
    reply(200, { token: 'tok', user });
    await renderApp();
    await fireEvent.changeText(await screen.findByPlaceholderText('Email'), 'a@b.co');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect((await screen.findAllByText('Today')).length).toBeGreaterThan(0);
    expect(store.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'tok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/auth/login');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co', password: 'secret123' });
  });

  it('shows the server error on failed login', async () => {
    reply(401, { error: 'Invalid credentials' });
    await renderApp();
    await fireEvent.changeText(await screen.findByPlaceholderText('Email'), 'a@b.co');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'bad');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid credentials')).toBeTruthy();
    expect(store.setItemAsync).not.toHaveBeenCalled();
    expect(screen).toHavePathname('/login');
  });

  it('shows profile, edits display name and logs out', async () => {
    store.getItemAsync.mockResolvedValue('tok');
    const grace = { ...user, displayName: 'Grace' };
    fetchMock.mockImplementation(async (url: string, init: { method?: string }) => {
      const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
      if (url.endsWith('/character')) return { ok: false, status: 500, json: async () => ({}) };
      return ok(init.method === 'PATCH' ? { user: grace } : { user });
    });
    await renderApp('/character');
    expect(await screen.findByText('Ada')).toBeTruthy();
    expect(screen.getByText('a@b.co')).toBeTruthy();

    await fireEvent.press(screen.getByText('Edit name'));
    await fireEvent.changeText(screen.getByPlaceholderText('Display name'), 'Grace');
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('Grace')).toBeTruthy();
    const patch = fetchMock.mock.calls.find(([, init]) => init.method === 'PATCH');
    expect(JSON.parse(patch?.[1].body)).toEqual({ displayName: 'Grace' });

    await fireEvent.press(screen.getByText('Log out'));
    await waitFor(() => expect(screen).toHavePathname('/login'));
    expect(store.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
