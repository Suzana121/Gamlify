import { useAuthStore } from '../../src/store/auth';
import { AuthForm } from '../../src/ui/AuthForm';

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  return (
    <AuthForm
      title="Create account"
      submitLabel="Register"
      onSubmit={register}
      altText="Have an account? Log in"
      altHref="/login"
    />
  );
}
