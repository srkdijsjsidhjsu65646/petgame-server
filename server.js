const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026#PetGame';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function genToken() { return crypto.randomBytes(32).toString('hex'); }

function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'no token' });
  const user = db.findUserByToken(token);
  if (!user) return res.status(401).json({ error: 'invalid token' });
  req.user = user; next();
}

function adminAuth(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(403).json({ error: 'wrong password' });
  next();
}

function publicUser(row) {
  return { username: row.username, gold: row.gold, fullness: row.fullness,
    hygiene: row.hygiene, energy: row.energy, food_croissant: row.food_croissant,
    food_hamburger: row.food_hamburger, food_chicken: row.food_chicken,
    has_helmet: !!row.has_helmet, helmet_equipped: !!row.helmet_equipped,
    is_vip: !!row.is_vip, last_vip_date: row.last_vip_date };
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 2 || password.length < 4)
    return res.json({ error: '用户名至少2字符，密码至少4字符' });
  if (db.findUser(username)) return res.json({ error: '用户名已存在' });
  const hash = bcrypt.hashSync(password, 10);
  const token = genToken();
  const user = db.createUser(username, hash, token, Date.now() + 30*24*60*60*1000);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const row = db.findUser(username);
  if (!row) return res.json({ error: '用户不存在' });
  if (!bcrypt.compareSync(password, row.password_hash)) return res.json({ error: '密码错误' });
  const token = genToken();
  db.updateUser(row.id, { token, token_expires: Date.now() + 30*24*60*60*1000 });
  const fresh = db.findUserById(row.id);
  res.json({ token, user: publicUser(fresh) });
});

app.get('/api/sync', auth, (req, res) => res.json(publicUser(req.user)));

app.post('/api/save', auth, (req, res) => {
  const d = req.body;
  db.updateUser(req.user.id, {
    gold: d.gold ?? req.user.gold,
    fullness: d.fullness ?? req.user.fullness,
    hygiene: d.hygiene ?? req.user.hygiene,
    energy: d.energy ?? req.user.energy,
    food_croissant: d.food_croissant ?? req.user.food_croissant,
    food_hamburger: d.food_hamburger ?? req.user.food_hamburger,
    food_chicken: d.food_chicken ?? req.user.food_chicken,
    has_helmet: d.has_helmet ? 1 : 0,
    helmet_equipped: d.helmet_equipped ? 1 : 0,
    is_vip: d.is_vip ? 1 : 0,
    last_vip_date: d.last_vip_date ?? req.user.last_vip_date
  });
  res.json({ ok: true });
});

const PRICES = { croissant:3, hamburger:5, chicken:4, helmet:300 };

app.post('/api/buy', auth, (req, res) => {
  const price = PRICES[req.body.item];
  if (!price) return res.json({ error: 'unknown item' });
  const vipPrice = req.user.is_vip ? Math.floor(price/2) : price;
  if (req.user.gold < vipPrice) return res.json({ error: '金币不足' });
  const updates = { gold: req.user.gold - vipPrice };
  if (req.body.item === 'helmet') {
    if (req.user.has_helmet) return res.json({ error: '已有头盔' });
    updates.has_helmet = 1; updates.helmet_equipped = 1;
  } else {
    updates['food_' + req.body.item] = req.user['food_' + req.body.item] + 1;
  }
  db.updateUser(req.user.id, updates);
  res.json({ ok: true, price: vipPrice, user: publicUser(db.findUserById(req.user.id)) });
});

app.post('/api/feed', auth, (req, res) => {
  const col = 'food_' + req.body.food;
  if (!req.user[col] || req.user[col] <= 0) return res.json({ error: '食物不足' });
  db.updateUser(req.user.id, {
    [col]: req.user[col] - 1,
    fullness: Math.min(100, req.user.fullness + (req.body.amount || 15))
  });
  res.json({ ok: true, user: publicUser(db.findUserById(req.user.id)) });
});

app.get('/api/announcement', auth, (req, res) => {
  res.json(db.latestAnnouncement() || { id:0, title:'', content:'' });
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  res.json(db.allUsers().map(u => ({ id:u.id, username:u.username, gold:u.gold, is_vip:u.is_vip, fullness:u.fullness, hygiene:u.hygiene, energy:u.energy })));
});

app.post('/api/admin/set', adminAuth, (req, res) => {
  const { id, field, value } = req.body;
  const allowed = ['gold','fullness','hygiene','energy','food_croissant','food_hamburger','food_chicken','has_helmet','helmet_equipped','is_vip'];
  if (!allowed.includes(field)) return res.json({ error: 'field not allowed' });
  db.updateUser(id, { [field]: value });
  res.json({ ok: true });
});

app.post('/api/admin/announce', adminAuth, (req, res) => {
  db.addAnnouncement(req.body.title, req.body.content);
  res.json({ ok: true });
});

app.get('/api/admin/announcements', adminAuth, (req, res) => {
  res.json(db.allAnnouncements());
});

app.listen(PORT, () => console.log('PetGame server on port ' + PORT));
