import jwt from 'jsonwebtoken';

const TOKEN_LIFETIME = '10d';

const createAuthToken = (user) => jwt.sign(
  { id: user.id || user._id, email: user.email, name: user.name },
  process.env.JWT_SECRET || 'dev-secret',
  { expiresIn: TOKEN_LIFETIME }
);

export default createAuthToken;