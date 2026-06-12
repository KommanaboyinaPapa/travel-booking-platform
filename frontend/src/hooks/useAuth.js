import { useAuthContext } from './AuthProvider.jsx';

export function useAuth() {
  return useAuthContext();
}
