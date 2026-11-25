const { MongoClient } = require('mongodb');
const { USER_SCHEMA } = require('../models/userSchema');

const memoryUsers = new Map();
const memoryNotes = new Map();
let users;
let notes;
let mode = 'memory';

const memoryUserCollection = {
  findOne: async (query) => [...memoryUsers.values()].find((user) => Object.entries(query).every(([key, value]) => user[key] === value)) || null,
  insertOne: async (user) => { memoryUsers.set(user._id, user); return { insertedId: user._id }; },
  find: () => ({ toArray: async () => [...memoryUsers.values()] })
};

const memoryNoteCollection = {
  insertOne: async (note) => { memoryNotes.set(note._id, note); return { insertedId: note._id }; },
  find: (query) => ({ sort: () => ({ toArray: async () => [...memoryNotes.values()].filter((note) => note.userId === query.userId).sort((a, b) => b.updatedAt - a.updatedAt) }) }),
  findOne: async (query) => {
    const note = memoryNotes.get(query._id);
    return note && (!query.userId || note.userId === query.userId) ? note : null;
  },
  updateOne: async (query, update) => {
    const note = memoryNotes.get(query._id);
    if (note && note.userId === query.userId) Object.assign(note, update.$set);
  },
  deleteOne: async (query) => {
    const note = memoryNotes.get(query._id);
    if (note && note.userId === query.userId) memoryNotes.delete(query._id);
  }
};

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set; using in-memory storage for this run.');
    return;
  }
  try {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2500 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'secure_connect');
    const userCollectionExists = await db.listCollections({ name: 'users' }, { nameOnly: true }).hasNext();
    if (userCollectionExists) {
      const legacyCompatibleSchema = {
        ...USER_SCHEMA,
        required: USER_SCHEMA.required.filter((field) => field !== 'username')
      };
      await db.command({ collMod: 'users', validator: { $jsonSchema: legacyCompatibleSchema }, validationLevel: 'strict', validationAction: 'error' });
    } else {
      await db.createCollection('users', { validator: { $jsonSchema: USER_SCHEMA }, validationLevel: 'strict', validationAction: 'error' });
    }
    users = db.collection('users');
    const usersWithoutUsername = users.find({ username: { $exists: false } });
    for await (const user of usersWithoutUsername) {
      const username = `member_${String(user._id).replace(/-/g, '').slice(0, 12)}`;
      await users.updateOne({ _id: user._id }, { $set: { username } });
    }
    if (userCollectionExists) {
      await db.command({ collMod: 'users', validator: { $jsonSchema: USER_SCHEMA }, validationLevel: 'strict', validationAction: 'error' });
    }
    notes = db.collection('notes');
    await users.createIndex({ email: 1 }, { unique: true });
    await notes.createIndex({ userId: 1, updatedAt: -1 });
    mode = 'mongodb';
    console.log(`Connected to MongoDB (${db.databaseName}).`);
  } catch (error) {
    console.warn(`MongoDB unavailable (${error.message}); using in-memory storage for this run.`);
  }
}

module.exports = {
  connectDatabase,
  getStorageMode: () => mode,
  getUsers: () => mode === 'mongodb' ? users : memoryUserCollection,
  getNotes: () => mode === 'mongodb' ? notes : memoryNoteCollection
};
