import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

const inMemoryUsers = [];
const profileFields = [
  'fullName',
  'tradingAlias',
  'phone',
  'city',
  'country',
  'timezone',
  'riskProfile',
  'tradingStyle',
  'experience',
  'primaryMarkets',
  'strategy',
  'preferredPairs',
  'bio',
  'goals',
  'customFields',
];

const findUserById = async (id) => {
  if (mongoose.connection.readyState === 1) {
    return User.findById(id);
  }

  return inMemoryUsers.find((user) => user._id === id);
};

const ensureDemoUser = async () => {
  if (inMemoryUsers.some((user) => user.email === 'demo@trading.com')) {
    return;
  }

  const hashedPassword = await bcrypt.hash('password123', 10);
  inMemoryUsers.push({
    _id: 'demo-user',
    name: 'Demo Trader',
    email: 'demo@trading.com',
    password: hashedPassword,
  });
};

const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await ensureDemoUser();
      const existingUser = inMemoryUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const newUser = {
        _id: `local-${Date.now()}`,
        name,
        email,
        password: await bcrypt.hash(password, salt),
      };
      inMemoryUsers.push(newUser);

      return res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        token: generateToken(newUser),
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await ensureDemoUser();
      const user = inMemoryUsers.find((item) => item.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user),
      });
    }

    let user = await User.findOne({ email });
    if (!user && email.toLowerCase() === 'demo@trading.com' && password === 'password123') {
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        user = await User.create({
          name: 'Demo Trader',
          email: 'demo@trading.com',
          password: hashedPassword,
        });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
        user = await User.findOne({ email: 'demo@trading.com' });
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

export const getMe = async (req, res) => {
  res.json({
    _id: req.user.id,
    name: req.user.name,
    email: req.user.email,
  });
};

export const getTraderProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      ...(user.profile || {}),
      fullName: user.profile?.fullName || user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load trader profile', error: error.message });
  }
};

export const updateTraderProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof req.body?.email === 'string' && req.body.email !== user.email) {
      return res.status(400).json({ message: 'Email cannot be changed' });
    }

    const updates = Object.fromEntries(
      profileFields
        .filter((field) => Object.hasOwn(req.body || {}, field))
        .map((field) => [field, req.body[field]])
    );

    if (Array.isArray(updates.customFields)) {
      updates.customFields = updates.customFields
        .filter((field) => field && typeof field === 'object')
        .map((field) => ({
          id: String(field.id || ''),
          label: String(field.label || ''),
          value: String(field.value || ''),
        }))
        .filter((field) => field.label && field.value);
    }

    user.profile = { ...(user.profile || {}), ...updates };
    if (mongoose.connection.readyState === 1) {
      await user.save();
    }

    res.json({
      ...user.profile,
      fullName: user.profile.fullName || user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not save trader profile', error: error.message });
  }
};
