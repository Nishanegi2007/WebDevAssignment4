const { listUsers } = require('../models/userModel');

async function users(_req, res, next) {
  try { return res.json({ users: await listUsers() }); }
  catch (error) { return next(error); }
}

module.exports = { users };
