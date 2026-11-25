const appEvents = require('../events/appEvents');
const noteModel = require('../models/noteModel');

function noteFields(req, res) {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required.' });
    return null;
  }
  return { title, content };
}

async function list(req, res, next) {
  try { return res.json({ notes: await noteModel.listNotes(req.user.sub) }); }
  catch (error) { return next(error); }
}

async function create(req, res, next) {
  const fields = noteFields(req, res);
  if (!fields) return undefined;
  try {
    const note = await noteModel.createNote(req.user.sub, fields.title, fields.content);
    appEvents.emit('note:created', { id: note.id, userId: req.user.sub });
    return res.status(201).json({ note });
  } catch (error) { return next(error); }
}

async function update(req, res, next) {
  const fields = noteFields(req, res);
  if (!fields) return undefined;
  try {
    const note = await noteModel.updateNote(req.user.sub, req.params.id, fields.title, fields.content);
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    return res.json({ note });
  } catch (error) { return next(error); }
}

async function remove(req, res, next) {
  try {
    const deleted = await noteModel.deleteNote(req.user.sub, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Note not found.' });
    return res.json({ message: 'Note deleted.' });
  } catch (error) { return next(error); }
}

module.exports = { list, create, update, remove };
