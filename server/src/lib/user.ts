export interface UserRecord {
  id: string;
  email: string;
  displayName: string | null;
}

export function publicUser(u: UserRecord) {
  return { id: u.id, email: u.email, displayName: u.displayName };
}
