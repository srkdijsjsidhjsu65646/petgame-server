const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'data.json');

let data = { users: [], announcements: [], nextUserId: 1 };

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch(e) { console.error('DB load error:', e); }
}
function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
load();

module.exports = {
  findUser: (username) => data.users.find(u => u.username === username),
  findUserById: (id) => data.users.find(u => u.id === id),
  findUserByToken: (token) => data.users.find(u => u.token === token && u.token_expires > Date.now()),
  createUser: (username, passwordHash, token, expires) => {
    const user = {
      id: data.nextUserId++, username, password_hash: passwordHash, token,
      token_expires: expires, gold: 9999, fullness: 0, hygiene: 100, energy: 100,
      food_croissant: 50, food_hamburger: 50, food_chicken: 50,
      has_helmet: 0, helmet_equipped: 0, is_vip: 0, last_vip_date: '',
      created_at: Date.now(), updated_at: Date.now()
    };
    data.users.push(user); save();
    return user;
  },
  updateUser: (id, updates) => {
    const u = data.users.find(x => x.id === id);
    if(u) { Object.assign(u, updates, { updated_at: Date.now() }); save(); }
    return u;
  },
  allUsers: () => data.users,
  addAnnouncement: (title, content) => {
    data.announcements.unshift({ id: Date.now(), title, content, created_at: Date.now() });
    save();
  },
  latestAnnouncement: () => data.announcements[0] || null,
  allAnnouncements: () => data.announcements
};
