const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
const { getUsers } = require('../config/database');
const { validateSignup } = require('./userSchema');

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function createUser(usernameInput, emailInput, password) {
  const username = typeof usernameInput === 'string' ? usernameInput.trim() : '';
  const email = normalizeEmail(emailInput);
  const validationError = validateSignup(username, email, password);
  if (validationError) {
    const error = new Error(validationError);
    error.status = 400;
    throw error;
  }
  const store = getUsers();
  if (await store.findOne({ email })) {
    const error = new Error('An account with that email already exists.');
    error.status = 409;
    throw error;
  }
  const user = {
    _id: randomUUID(),
    username,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: email === (process.env.ADMIN_EMAIL || '').trim().toLowerCase() ? 'admin' : 'user',
    createdAt: new Date()
  };
  await store.insertOne(user);
  return user;
}

async function findUserByEmail(emailInput) {
  return getUsers().findOne({ email: normalizeEmail(emailInput) });
}

async function verifyPassword(user, password) {
  return Boolean(user && await bcrypt.compare(typeof password === 'string' ? password : '', user.passwordHash));
}

async function listUsers() {
  const users = await getUsers().find().toArray();
  return users.map(({ _id, username, email, role, createdAt }) => ({ id: _id, username, email, role, createdAt }));
}

module.exports = { createUser, findUserByEmail, verifyPassword, listUsers };
