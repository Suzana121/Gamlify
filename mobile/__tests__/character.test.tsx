import { render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '../src/store/auth';
import { useCharacterStore } from '../src/store/character';
import { Avatar } from '../src/ui/Avatar';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const store = SecureStore as jest.Mocked<typeof SecureStore>;
const user = { id: '1', email: 'a@b.co', displayName: 'Ada' };
const fetchMock = jest.fn();

const character = {
  xp: 130,
  level: 3,
  xpIntoLevel: 30,
  xpForNextLevel: 120,
  stage: 3,
  currentStreak: 4,
  longestStreak: 9,
};

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

function serve(characterBody: unknown) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/me')) return res(200, { user });
    if (url.endsWith('/character')) return res(200, { character: characterBody });
    throw new Error(`unexpected request ${url}`);
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  useAuthStore.setState({ token: null, user: null, hydrated: false });
  useCharacterStore.getState().reset();
  store.getItemAsync.mockResolvedValue('tok');
});

describe('Avatar', () => {
  it.each([1, 2, 3, 4, 5])('renders stage %i', async (stage) => {
    await render(<Avatar stage={stage} />);
    expect(screen.getByTestId(`avatar-stage-${stage}`)).toBeTruthy();
  });

  it('clamps out-of-range stages', async () => {
    await render(<Avatar stage={9} />);
    expect(screen.getByTestId('avatar-stage-5')).toBeTruthy();
  });
});

describe('Character tab', () => {
  it('loads on focus and shows avatar, level, progress and streak', async () => {
    serve(character);
    await renderRouter('./app', { initialUrl: '/character' });
    expect(await screen.findByText('Level 3')).toBeTruthy();
    expect(screen.getByTestId('avatar-stage-3')).toBeTruthy();
    expect(screen.getByText('30 / 120 XP')).toBeTruthy();
    expect(screen.getByLabelText('XP progress')).toHaveProp(
      'accessibilityValue',
      expect.objectContaining({ now: 25 }),
    );
    expect(screen.getByText('Current streak 4 days · Best 9')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/character',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('shows a different avatar for a different stage', async () => {
    serve({ ...character, stage: 5, currentStreak: 1 });
    await renderRouter('./app', { initialUrl: '/character' });
    expect(await screen.findByTestId('avatar-stage-5')).toBeTruthy();
    expect(screen.queryByTestId('avatar-stage-3')).toBeNull();
    expect(screen.getByText('Current streak 1 day · Best 9')).toBeTruthy();
  });
});

describe('character store', () => {
  it('resets on logout', async () => {
    useAuthStore.setState({ token: 'tok', user, hydrated: true });
    serve(character);
    await useCharacterStore.getState().load();
    expect(useCharacterStore.getState().character).toEqual(character);
    useAuthStore.setState({ token: null });
    await waitFor(() => expect(useCharacterStore.getState().character).toBeNull());
  });

  it('records an error when loading fails', async () => {
    useAuthStore.setState({ token: 'tok', user, hydrated: true });
    fetchMock.mockResolvedValue(res(500, { error: 'Internal server error' }));
    await useCharacterStore.getState().load();
    expect(useCharacterStore.getState().error).toBe('Internal server error');
    expect(useCharacterStore.getState().character).toBeNull();
  });

  it('does not fetch without a token', async () => {
    await useCharacterStore.getState().load();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
