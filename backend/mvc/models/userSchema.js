// MongoDB document schema for the users collection.
const USER_SCHEMA = {
  bsonType: 'object',
  title: 'User',
  required: ['_id', 'username', 'email', 'passwordHash', 'role', 'createdAt'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'string', description: 'Unique user ID' },
    username: {
      bsonType: 'string',
      minLength: 3,
      maxLength: 24,
      pattern: '^[A-Za-z0-9_]+$',
      description: 'Public username containing letters, numbers, or underscores'
    },
    email: {
      bsonType: 'string',
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      description: 'Unique, normalized email address'
    },
    passwordHash: {
      bsonType: 'string',
      description: 'bcrypt hash; never store the plain-text password'
    },
    role: {
      bsonType: 'string',
      enum: ['user', 'admin'],
      description: 'Authorization role assigned by the server'
    },
    createdAt: { bsonType: 'date', description: 'Account creation time' }
  }
};

function validateSignup(username, email, password) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,24}$/.test(username.trim())) {
    return 'Username must be 3–24 characters using only letters, numbers, or underscores.';
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Provide a valid email and a password with at least 8 characters.';
  }
  if (typeof password !== 'string' || password.length < 8) {
    return 'Provide a valid email and a password with at least 8 characters.';
  }
  return null;
}

module.exports = { USER_SCHEMA, validateSignup };
