const authView = document.querySelector('#auth-view');
const appView = document.querySelector('#app-view');
const authForm = document.querySelector('#auth-form');
const authMessage = document.querySelector('#auth-message');
let mode = 'login';
let socket;
const tokenKey = 'secure-connect-token';
let token = sessionStorage.getItem(tokenKey);

function setMessage(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle('error', error);
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelector('#login-tab').classList.toggle('active', mode === 'login');
  document.querySelector('#signup-tab').classList.toggle('active', mode === 'signup');
  document.querySelector('#auth-title').textContent = mode === 'login' ? 'Sign in to Secure Connect' : 'Create your account';
  document.querySelector('#auth-subtitle').textContent = mode === 'login' ? 'Enter your details to continue.' : 'A few details and you’re all set.';
  document.querySelector('#auth-submit').innerHTML = mode === 'login' ? 'Sign in <span>→</span>' : 'Create account <span>→</span>';
  document.querySelector('#password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  const usernameField = document.querySelector('#username-field');
  usernameField.classList.toggle('hidden', mode !== 'signup');
  document.querySelector('#username').required = mode === 'signup';
  setMessage(authMessage, '');
}
document.querySelector('#login-tab').addEventListener('click', () => setMode('login'));
document.querySelector('#signup-tab').addEventListener('click', () => setMode('signup'));

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#auth-submit');
  button.disabled = true;
  setMessage(authMessage, mode === 'login' ? 'Signing you in…' : 'Creating your account…');
  try {
    const data = await api(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
      method: 'POST', body: JSON.stringify({
        username: document.querySelector('#username').value,
        email: document.querySelector('#email').value,
        password: document.querySelector('#password').value
      })
    });
    if (mode === 'signup') {
      setMode('login');
      setMessage(authMessage, 'Account created. Sign in to continue.');
      document.querySelector('#password').value = '';
    } else {
      token = data.token;
      sessionStorage.setItem(tokenKey, token);
      await showWorkspace();
    }
  } catch (error) { setMessage(authMessage, error.message, true); }
  finally { button.disabled = false; }
});

async function showWorkspace() {
  const data = await api('/api/me');
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  const adminNotice = document.querySelector('#admin-notice');
  if (data.user.role === 'admin') {
    adminNotice.classList.remove('hidden');
    adminNotice.innerHTML = 'Administrator access enabled · <button id="view-users">View registered users</button>';
    document.querySelector('#view-users').addEventListener('click', async () => {
      try { const result = await api('/api/admin/users'); alert(result.users.map((user) => `${user.email} · ${user.role}`).join('\n') || 'No users yet.'); }
      catch (error) { alert(error.message); }
    });
  }
  await loadNotes();
  connectChat();
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function loadNotes() {
  try {
    const { notes } = await api('/api/notes');
    document.querySelector('#note-count').textContent = notes.length;
    const list = document.querySelector('#notes-list');
    list.replaceChildren();
    if (!notes.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-chat'; empty.textContent = 'Your notes will show up here.'; list.append(empty); return;
    }
    notes.forEach((note) => {
      const item = document.createElement('article'); item.className = 'note-item'; item.dataset.id = note.id;
      item.innerHTML = `<button class="note-delete" aria-label="Delete note">Delete</button><h3>${escapeHTML(note.title)}</h3><p>${escapeHTML(note.content)}</p><time class="note-date">${new Date(note.updatedAt).toLocaleString()}</time>`;
      item.querySelector('.note-delete').addEventListener('click', async () => {
        try { await api(`/api/notes/${encodeURIComponent(note.id)}`, { method: 'DELETE' }); await loadNotes(); }
        catch (error) { setMessage(document.querySelector('#note-message'), error.message, true); }
      });
      list.append(item);
    });
  } catch (error) { setMessage(document.querySelector('#note-message'), error.message, true); }
}

document.querySelector('#note-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/notes', { method: 'POST', body: JSON.stringify({ title: document.querySelector('#note-title').value, content: document.querySelector('#note-content').value }) });
    event.currentTarget.reset(); setMessage(document.querySelector('#note-message'), 'Note saved.'); await loadNotes();
  } catch (error) { setMessage(document.querySelector('#note-message'), error.message, true); }
});

function addChatMessage(data, system = false) {
  const log = document.querySelector('#chat-log');
  log.querySelector('.empty-chat')?.remove();
  const entry = document.createElement('div'); entry.className = `chat-entry${system ? ' system' : ''}`;
  if (system) entry.textContent = data.message;
  else entry.innerHTML = `<b>${escapeHTML(data.username)}</b><time>${new Date(data.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><div>${escapeHTML(data.message)}</div>`;
  log.append(entry); log.scrollTop = log.scrollHeight;
}

function connectChat() {
  if (socket) socket.disconnect();
  socket = io({ auth: { token } });
  socket.on('chat:message', (data) => addChatMessage(data));
  socket.on('chat:system', (data) => addChatMessage(data, true));
  socket.on('connect_error', (error) => addChatMessage({ message: error.message }, true));
}

document.querySelector('#chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#chat-message');
  if (input.value.trim() && socket?.connected) { socket.emit('chat:message', { message: input.value.trim() }); input.value = ''; }
});

document.querySelector('#logout').addEventListener('click', () => {
  socket?.disconnect(); socket = null; token = null; sessionStorage.removeItem(tokenKey);
  appView.classList.add('hidden'); authView.classList.remove('hidden'); document.querySelector('#admin-notice').classList.add('hidden');
  document.querySelector('#auth-form').reset(); setMode('login');
});

if (token) showWorkspace().catch(() => {
  token = null; sessionStorage.removeItem(tokenKey); authView.classList.remove('hidden'); appView.classList.add('hidden');
});
