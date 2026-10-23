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

// ============ 工具函数 ============
function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

function auth(req, res, next) {
  const token = req.headers['authorization'] || req.headers['Authorization'];
  if (!token) return res.status(401).json({ error: 'no token' });
  const row = db.prepare('SELECT * FROM users WHERE token = ? AND token_expires > ?').get(token, Date.now());
  if (!row) return res.status(401).json({ error: 'invalid or expired token' });
  req.user = row;
  next();
}

function adminAuth(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) return res.status(403).json({ error: 'wrong admin password' });
  next();
}

function publicUser(row) {
  return {
    username: row.username,
    gold: row.gold,
    fullness: row.fullness,
    hygiene: row.hygiene,
    energy: row.energy,
    food_croissant: row.food_croissant,
    food_hamburger: row.food_hamburger,
    food_chicken: row.food_chicken,
    has_helmet: !!row.has_helmet,
    helmet_equipped: !!row.helmet_equipped,
    is_vip: !!row.is_vip,
    last_vip_date: row.last_vip_date
  };
}

// ============ App API ============
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 2 || password.length < 4) {
    return res.json({ error: '用户名至少2字符，密码至少4字符' });
  }
  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exist) return res.json({ error: '用户名已存在' });
  const hash = bcrypt.hashSync(password, 10);
  const token = genToken();
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const info = db.prepare(
    'INSERT INTO users (username, password_hash, token, token_expires) VALUES (?,?,?,?)'
  ).run(username, hash, token, expires);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ token, user: publicUser(row) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row) return res.json({ error: '用户不存在' });
  if (!bcrypt.compareSync(password, row.password_hash)) return res.json({ error: '密码错误' });
  const token = genToken();
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  db.prepare('UPDATE users SET token = ?, token_expires = ? WHERE id = ?').run(token, expires, row.id);
  const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(row.id);
  res.json({ token, user: publicUser(fresh) });
});

app.get('/api/sync', auth, (req, res) => {
  res.json(publicUser(req.user));
});

app.post('/api/save', auth, (req, res) => {
  const d = req.body;
  db.prepare(`UPDATE users SET
    gold=?, fullness=?, hygiene=?, energy=?,
    food_croissant=?, food_hamburger=?, food_chicken=?,
    has_helmet=?, helmet_equipped=?, is_vip=?, last_vip_date=?,
    updated_at=strftime('%s','now')
    WHERE id=?`).run(
    d.gold ?? req.user.gold,
    d.fullness ?? req.user.fullness,
    d.hygiene ?? req.user.hygiene,
    d.energy ?? req.user.energy,
    d.food_croissant ?? req.user.food_croissant,
    d.food_hamburger ?? req.user.food_hamburger,
    d.food_chicken ?? req.user.food_chicken,
    d.has_helmet ? 1 : 0,
    d.helmet_equipped ? 1 : 0,
    d.is_vip ? 1 : 0,
    d.last_vip_date ?? req.user.last_vip_date,
    req.user.id
  );
  res.json({ ok: true });
});

const PRICES = { croissant: 3, hamburger: 5, chicken: 4, helmet: 300 };

app.post('/api/buy', auth, (req, res) => {
  const { item } = req.body;
  const price = PRICES[item];
  if (!price) return res.json({ error: 'unknown item' });
  const vipPrice = req.user.is_vip ? Math.floor(price / 2) : price;
  if (req.user.gold < vipPrice) return res.json({ error: '金币不足' });
  if (item === 'helmet') {
    if (req.user.has_helmet) return res.json({ error: '已有头盔' });
    db.prepare('UPDATE users SET gold=gold-?, has_helmet=1, helmet_equipped=1 WHERE id=?')
      .run(vipPrice, req.user.id);
  } else {
    db.prepare('UPDATE users SET gold=gold-?, food_'+item+'=food_'+item+'+1 WHERE id=?')
      .run(vipPrice, req.user.id);
  }
  const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  res.json({ ok: true, price: vipPrice, user: publicUser(fresh) });
});

app.post('/api/feed', auth, (req, res) => {
  const { food, amount } = req.body;
  const col = 'food_' + food;
  const have = req.user[col];
  if (!have || have <= 0) return res.json({ error: '食物不足' });
  const add = amount || 15;
  db.prepare(`UPDATE users SET ${col}=${col}-1, fullness=MIN(100, fullness+?), updated_at=strftime('%s','now') WHERE id=?`)
    .run(add, req.user.id);
  const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  res.json({ ok: true, user: publicUser(fresh) });
});

// ============ 公告 API ============
app.get('/api/announcement', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM announcements ORDER BY id DESC LIMIT 1').get();
  res.json(row || { id: 0, title: '', content: '' });
});

// ============ 管理 API ============
app.get('/api/admin/users', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT id, username, gold, is_vip, fullness, hygiene, energy, created_at, updated_at FROM users ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/admin/set', adminAuth, (req, res) => {
  const { id, field, value } = req.body;
  const allowed = ['gold', 'fullness', 'hygiene', 'energy', 'food_croissant', 'food_hamburger', 'food_chicken', 'has_helmet', 'helmet_equipped', 'is_vip'];
  if (!allowed.includes(field)) return res.json({ error: 'field not allowed' });
  db.prepare(`UPDATE users SET ${field}=?, updated_at=strftime('%s','now') WHERE id=?`).run(value, id);
  res.json({ ok: true });
});

app.get('/api/admin/announcements', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/admin/announce', adminAuth, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.json({ error: 'title and content required' });
  db.prepare('INSERT INTO announcements (title, content) VALUES (?, ?)').run(title, content);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('PetGame server running on http://0.0.0.0:' + PORT);
});
