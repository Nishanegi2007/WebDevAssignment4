const jwt = require('jsonwebtoken');
const appEvents = require('../events/appEvents');
const { createUser, findUserByEmail, verifyPassword } = require('../models/userModel');

async function signup(req, res, next) {
  try {
    const user = await createUser(req.body.username, req.body.email, req.body.password);
    appEvents.emit('user:registered', { id: user._id, email: user.email });
    return res.status(201).json({ message: 'Account created successfully.', user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (error) { return next(error); }
}

async function login(req, res, next) {
  try {
    const user = await findUserByEmail(req.body.email);
    if (!await verifyPassword(user, req.body.password)) return res.status(401).json({ error: 'Invalid email or password.' });
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    const token = jwt.sign({ sub: user._id, username: user.username, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn });
    return res.json({ message: 'Login successful.', token, expiresIn, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (error) { return next(error); }
}

function currentUser(req, res) {
  return res.json({ user: { id: req.user.sub, username: req.user.username, email: req.user.email, role: req.user.role } });
}

module.exports = { signup, login, currentUser };
