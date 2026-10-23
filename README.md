# 我的小鲨鲨 - 云端后端

## 本地运行
```bash
cd server
npm install
npm start
```
访问 http://localhost:3000

## 管理后台
浏览器打开 http://localhost:3000
管理员密码默认 `admin123`，可通过环境变量 `ADMIN_PASSWORD` 修改。

## 免费部署到 Render
1. 推送代码到 GitHub
2. 在 Render 新建 Web Service，连接仓库
3. Build Command: `npm install`
4. Start Command: `npm start`
5. 环境变量：`ADMIN_PASSWORD=你的密码`
6. 部署后获得 URL（如 `https://petgame.onrender.com`）
7. 修改 App 中的 `SERVER_URL` 为该地址

## 免费部署到 Railway
1. 推送代码到 GitHub
2. 在 Railway 新建 Project，选择 GitHub 仓库
3. Railway 自动识别 Node.js，自动运行 `npm start`
4. 设置环境变量 `ADMIN_PASSWORD`
5. 获得域名后修改 App 中的 `SERVER_URL`

## API 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/register | 注册（username+password），返回 token |
| POST | /api/login | 登录，返回 token + 用户数据 |
| GET | /api/sync | 拉取数据（Header: Authorization: token） |
| POST | /api/save | 保存数据（Header: Authorization: token） |
| POST | /api/buy | 购买物品（服务器校验金币） |
| POST | /api/feed | 喂食（服务器校验食物数量） |
| GET | /api/admin/users | 管理：用户列表（Header: X-Admin-Password） |
| POST | /api/admin/set | 管理：修改用户数据 |

## 注意
- SQLite 数据库文件 `data.db` 自动创建
- Token 有效期 30 天
- 密码 bcrypt 哈希存储
