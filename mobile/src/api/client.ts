export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

export type User = { id: string; email: string; displayName: string };
export type Frequency = 'daily' | 'weekly';
export type Habit = {
  id: string;
  name: string;
  category: string;
  frequency: Frequency;
  targetMinutes: number | null;
};
export type HabitInput = Omit<Habit, 'id'>;
export type AuthResponse = { token: string; user: User };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Options = { method?: string; body?: unknown; token?: string | null };

async function request<T>(path: string, { method = 'GET', body, token }: Options = {}) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Network error. Please check your connection.');
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON body
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token: string) => request<{ user: User }>('/me', { token }),
  updateMe: (token: string, displayName: string) =>
    request<{ user: User }>('/me', { method: 'PATCH', body: { displayName }, token }),
  listHabits: (token: string) => request<{ habits: Habit[] }>('/habits', { token }),
  createHabit: (token: string, input: HabitInput) =>
    request<{ habit: Habit }>('/habits', { method: 'POST', body: input, token }),
  updateHabit: (token: string, id: string, input: Partial<HabitInput>) =>
    request<{ habit: Habit }>(`/habits/${id}`, { method: 'PATCH', body: input, token }),
  deleteHabit: (token: string, id: string) =>
    request<null>(`/habits/${id}`, { method: 'DELETE', token }),
};
