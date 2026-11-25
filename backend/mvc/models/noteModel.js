const { randomUUID } = require('node:crypto');
const { getNotes } = require('../config/database');

async function listNotes(userId) {
  const notes = await getNotes().find({ userId }).sort({ updatedAt: -1 }).toArray();
  return notes.map(toPublicNote);
}

async function createNote(userId, title, content) {
  const now = new Date();
  const note = { _id: randomUUID(), userId, title, content, createdAt: now, updatedAt: now };
  await getNotes().insertOne(note);
  return toPublicNote(note);
}

async function updateNote(userId, id, title, content) {
  const store = getNotes();
  const note = await store.findOne({ _id: id, userId });
  if (!note) return null;
  const updatedAt = new Date();
  await store.updateOne({ _id: id, userId }, { $set: { title, content, updatedAt } });
  return toPublicNote({ ...note, title, content, updatedAt });
}

async function deleteNote(userId, id) {
  const store = getNotes();
  const note = await store.findOne({ _id: id, userId });
  if (!note) return false;
  await store.deleteOne({ _id: id, userId });
  return true;
}

function toPublicNote({ _id, title, content, createdAt, updatedAt }) {
  return { id: _id, title, content, createdAt, updatedAt };
}

module.exports = { listNotes, createNote, updateNote, deleteNote };
