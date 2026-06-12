export async function registerUser(userData) {
  // Add registration business logic here.
  return { id: 1, ...userData };
}

export async function authenticateUser(credentials) {
  // Add login/authentication logic here.
  return { id: 1, email: credentials.email };
}
