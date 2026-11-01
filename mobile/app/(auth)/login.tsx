import { useAuthStore } from '../../src/store/auth';
import { AuthForm } from '../../src/ui/AuthForm';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      onSubmit={login}
      altText="No account? Register"
      altHref="/register"
    />
  );
}
