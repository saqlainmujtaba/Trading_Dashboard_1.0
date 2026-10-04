import jwt from 'jsonwebtoken';

const TOKEN_LIFETIME = '10d';

const createAuthToken = (user) => {
  const payload = { id: user.id || user._id, email: user.email, name: user.name };
  if (user.isDemo) {
    const demoExpiresAt = Number(user.demoExpiresAt ?? user.expiresAt);
    if (Number.isFinite(demoExpiresAt)) {
      payload.isDemo = true;
      payload.demoExpiresAt = demoExpiresAt;
    }
  }

  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: TOKEN_LIFETIME });
};

export default createAuthToken;