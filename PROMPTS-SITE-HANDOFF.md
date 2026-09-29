# 交接文档：KotoriVPN 服务器 + Prompts 网站项目

> 生成时间：2026-09-28
> 用途：把上一个 DSH 会话的全部上下文打包，供新会话（工作区 `F:\REPO\prompts-site`）无缝接续。
> 新会话开场白建议：**「读 HANDOFF.md，然后我们开始写网站」**

---

## 0. 一句话背景

用户在一台 Debian 13 的 VPS 上跑 **KotoriVPN 面板**（3x-ui 的樱花主题 fork）+ **REALITY 代理服务**。
现在要在**同一台机器**上再部署一个**个人自用的 AI 图片生成提示词收集网站**，
要求**不影响 VPN 服务**。基础设施已经全部搭好，**只差写网站代码**。

---

## 1. 服务器

| 项 | 值 |
|---|---|
| IP | `149.62.44.144` |
| 系统 | Debian 13 |
| CPU | 2 核 |
| 内存 | **967 MB**（很紧张，是主要约束） |
| Swap | 2 GB（`/swapfile`） |
| 磁盘 | `/dev/vda1` 20 G，约 15 G 可用 |
| 已装 | gcc 14.2.0、Go 1.27.0、nginx 1.26.3、sqlite3、socat、acme.sh |

**SSH**：`root@149.62.44.144`

### ⚠️ `/tmp` 是 tmpfs，只有 484 MB

编译类操作**必须**改临时目录，否则会 `no space left on device`：

```bash
export GOTMPDIR=/opt/gotmp TMPDIR=/opt/gotmp
```

---

## 2. 域名与 DNS

- 域名：**`kanbekotori.top`**
- DNS 托管：**阿里云云解析**（NS = `dns13.hichina.com` / `dns14.hichina.com`）
- 两条 A 记录都指向 `149.62.44.144`：

| 域名 | 用途 |
|---|---|
| `panel.kanbekotori.top` | 面板 |
| `prompts.kanbekotori.top` | 待建的提示词网站 |

> 阿里云 RAM 子账号 AccessKey 需授权 **`AliyunDNSFullAccess`**（acme.sh 的 `--dns dns_ali` 用它做 DNS-01）。

---

## 3. 当前架构（已上线）

```
                        ┌─ panel.kanbekotori.top  → 127.0.0.1:2087   x-ui 面板
Internet ─── 443 ────── nginx
                        └─ prompts.kanbekotori.top → 127.0.0.1:8080  ← 待建网站

           ─── 8443 ─── xray-linux-amd64（VLESS + REALITY，用户的代理服务）
           ─── 22 ───── sshd
           ─── 80 ───── 空（服务商层面不可用，从始至终没用到）
```

### 端口占用（当前实测）

| 端口 | 进程 | 绑定 |
|---|---|---|
| `443` | nginx | `0.0.0.0` + `[::]` |
| `2087` | x-ui | **`127.0.0.1`（仅回环）** |
| `8443` | xray-linux-amd64 | `*` |
| `22` | sshd | `*` |
| `80` | — | 空 |

**铁律**：
- `8443` 是用户的**代理命脉**，任何时候都别碰
- `443` 是 nginx，新增网站只需再加一个 `server` 块
- 任何新服务**必须绑 `127.0.0.1`**，绝不绑 `0.0.0.0`

---

## 4. 各组件细节

### 4.1 x-ui 面板（KotoriVPN，3x-ui v3.7.0 的 fork）

| 项 | 路径/值 |
|---|---|
| 二进制 | `/usr/local/x-ui/x-ui` |
| 源码 | `/opt/3x-ui`（`git clone https://github.com/K4nbeK0tori/KotoriVPNPanel.git`） |
| 数据库 | `/etc/x-ui/x-ui.db` |
| 日志 | `/var/log/x-ui/3xui.log` |
| bin 目录 | `/usr/local/x-ui/bin/`（`xray-linux-amd64`、`geoip.dat`、`geosite.dat`） |
| systemd | `x-ui.service` |
| 监听 | **`127.0.0.1:2087`** |
| TLS | **无**（明文 HTTP，TLS 由 nginx 终结） |

**当前设置**（`sqlite3 /etc/x-ui/x-ui.db "SELECT key,value FROM settings;"`）：

```
webListen   = 127.0.0.1
webPort     = 2087
webCertFile = （空）
webKeyFile  = （空）
webBasePath = /
```

**⚠️ `hasDefaultCredential: true`** —— 面板还是默认的 `admin` / `admin`，**尚未修改**。

### 4.2 nginx

配置文件名和内容：

**`/etc/nginx/conf.d/00-upgrade-map.conf`**
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

**`/etc/nginx/conf.d/kotori.conf`**
```nginx
# ================= 面板 =================
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name panel.kanbekotori.top;

    ssl_certificate     /etc/ssl/kotori/site.crt;
    ssl_certificate_key /etc/ssl/kotori/site.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;

    location / {
        proxy_pass         http://127.0.0.1:2087;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        $connection_upgrade;
        proxy_read_timeout 300s;
        proxy_buffering    off;
    }
}

# ================= 网站（占位，还没部署） =================
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name prompts.kanbekotori.top;

    ssl_certificate     /etc/ssl/kotori/site.crt;
    ssl_certificate_key /etc/ssl/kotori/site.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

> `/etc/nginx/sites-enabled/default` 已被删除（当初是为了不占 80）。
> **网站的 server 块已经写好了**，只要 Go 程序监听 `127.0.0.1:8080`，`https://prompts.kanbekotori.top` 立刻可访问。

### 4.3 TLS 证书

| 项 | 值 |
|---|---|
| 证书文件 | `/etc/ssl/kotori/site.crt` + `/etc/ssl/kotori/site.key` |
| SAN | `panel.kanbekotori.top` + `prompts.kanbekotori.top`（**一张证书覆盖两个域名**） |
| 签发 | 2026-09-28，Let's Encrypt |
| 到期 | **2026-12-27** |
| 续期方式 | **DNS-01**（阿里云 `dns_ali`），ARI 窗口 2026-11-26 ~ 11-28 |
| acme.sh 目录 | `/root/.acme.sh/panel.kanbekotori.top_ecc/` |
| 续期钩子 | `Le_ReloadCmd=systemctl reload nginx`，`Le_PreHook=`（**空**，不需要停服务） |

**关键：续期全程不占用 80/443，不会中断面板和 VPN。**

新增网站域名时，追加 `-d 新域名` 重新 `--issue --force` 即可，**注意不要加 `--keylength ec`**（见 §6 坑 3）。

### 4.4 Xray REALITY 入站（用户的代理服务）

| 项 | 值 |
|---|---|
| 端口 | `8443` |
| 协议 | VLESS + `xtls-rprx-vision` |
| 安全 | REALITY（TCP + TLS） |
| xray 版本 | `26.3.27` |
| 客户端地址 | `149.62.44.144:8443`（**不要用 panel 域名**） |

**REALITY 的 `dest` / SNI 绝不能指向 `prompts.kanbekotori.top`** —— 那会和同机服务形成回环。

---

## 5. 网站项目需求（已确定）

### 5.1 产品定位

**AI 图片生成提示词收集网站**，个人自用但**公开可读**。

### 5.2 已确认的决策

| 问题 | 决定 |
|---|---|
| **数据来源** | **用户已有文件**（JSON / CSV / 表格），写一次性导入脚本 |
| **访问控制** | **公开可读，只有用户能编辑**（管理员登录后才有写权限） |
| **前端风格** | **樱花风，对齐面板**（Vite + React + Ant Design） |
| **后端** | Go + `net/http` |
| **数据库** | SQLite（`modernc.org/sqlite`，**纯 Go，不用 CGO**） |
| **部署** | 本地 Windows 交叉编译 → scp 单个二进制 → systemd |

### 5.3 技术选型理由

- **Go 而非 Node/Python**：服务器只有 967 MB 内存，Node 一个 `node_modules` 就吃光预算。
  Go 单二进制运行内存约 **25 MB**，且**服务器上不需要装任何运行时**。
- **`modernc.org/sqlite` 而非 `mattn/go-sqlite3`**：后者需要 CGO + gcc，
  交叉编译极其痛苦（用户已经在这台机器上被 Go 编译坑过一次）。
- **本地交叉编译**：服务器 2 核编译要 10-30 分钟且容易 OOM，**永远不要在服务器上编译**。

### 5.4 建议的项目结构

```
F:\REPO\prompts-site\
├── go.mod
├── main.go                    # 入口 + 子命令（serve / import）
├── internal/
│   ├── db/                    # SQLite 初始化 + 迁移
│   ├── api/                   # 路由 + handler
│   └── auth/                  # 会话登录
├── frontend/                  # Vite + React + Ant Design 源码
│   └── src/
├── web/                       # 前端构建产物，用 //go:embed 打进二进制
└── deploy/
    ├── prompts.service        # systemd 单元
    └── deploy.ps1             # 本地构建 + scp + 重启
```

### 5.5 数据表草案（待按真实数据调整）

```sql
CREATE TABLE prompts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,          -- 正向提示词
  negative     TEXT DEFAULT '',        -- 负面提示词
  tags         TEXT DEFAULT '',        -- 标签
  model        TEXT DEFAULT '',        -- 适用模型
  source_url   TEXT DEFAULT '',
  preview_url  TEXT DEFAULT '',        -- 预览图**外链**
  favorite     INTEGER DEFAULT 0,
  created_at   DATETIME,
  updated_at   DATETIME
);
```

> **图片一律存外链，绝不存服务器** —— 磁盘只有 15 G，也不能存进 SQLite BLOB。

### 5.6 接口草案

| 方法 | 路径 | 权限 |
|---|---|---|
| `GET` | `/api/prompts?q=&tag=&page=` | 公开 |
| `GET` | `/api/prompts/:id` | 公开 |
| `GET` | `/api/tags` | 公开 |
| `POST` | `/api/prompts` | 需登录 |
| `PUT` | `/api/prompts/:id` | 需登录 |
| `DELETE` | `/api/prompts/:id` | 需登录 |
| `POST` | `/api/login` | 公开（要限流） |

### 5.7 面板樱花主题配色（直接复用）

来自 `frontend/src/hooks/useTheme.tsx:35-69`：

```js
// 亮色
colorPrimary:    '#ec4899'
primaryHover:    '#f06292'
primaryActive:   '#d63384'
colorBgBase:     '#fff5f9'
colorBgLayout:   '#fdf2f8'
colorBgContainer:'#ffffff'

// 暗色
colorPrimary:    '#f472b6'
primaryHover:    '#f9a8d4'
primaryActive:   '#ec4899'
colorBgBase:     '#191420'
colorBgLayout:   '#191420'
colorBgContainer:'#221a2e'
colorBgElevated: '#2a2138'

// 玄黑（ultra dark）
colorBgBase:     '#0d0912'
colorBgLayout:   '#0d0912'
colorBgContainer:'#140e1c'
colorBgElevated: '#1c1426'

borderRadius:    12
```

**樱花飘落特效**可直接抄面板的：
- `frontend/src/components/SakuraLayer.tsx` —— 12 片花瓣，可用开关控制
- `frontend/src/styles/sakura.css` —— 完整 CSS 动画
- 本地参考：`F:\REPO\3xui\frontend\src\components\SakuraLayer.tsx` 和 `F:\REPO\3xui\frontend\src\styles\sakura.css`

### 5.8 systemd 单元（草案）

```ini
[Unit]
Description=Prompts Site
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/prompts
ExecStart=/usr/local/bin/prompts-server
Restart=always
RestartSec=5
# 内存保险丝：超限自杀重启，避免拖累 Xray 导致 VPN 断线
MemoryMax=300M

[Install]
WantedBy=multi-user.target
```

### 5.9 本地交叉编译命令

```powershell
$env:CGO_ENABLED="0"
$env:GOOS="linux"
$env:GOARCH="amd64"
go build -trimpath -ldflags "-s -w" -o prompts-server .
```

---

## 6. 🔴 铁律与血泪教训（务必读）

### 1. **绝对不要点面板里的「更新」按钮**

`internal/web/service/panel/panel.go` 里的 `panelUpdaterURL` 指向**上游官方 3x-ui** 的 `update.sh`。
它会：
- 拉取**官方版**覆盖掉用户定制的樱花皮肤
- 在解压前**先删除** systemd 单元、`x-ui`、`bin/xray-*`、`bin/mtg-*`（`update.sh:1022-1048`）
- 一旦中断就**无法通过重跑恢复**（会报 `Current x-ui version: unknown`）

**升级只能手工**：
```bash
cd /opt/3x-ui && git pull
export GOTMPDIR=/opt/gotmp TMPDIR=/opt/gotmp
CGO_ENABLED=1 go build -p 1 -o x-ui .
cp x-ui /usr/local/x-ui/x-ui && systemctl restart x-ui
```

### 2. **`bin/` 目录永远需要手工填充**

`internal/xray/process.go` 的 `Start()` **只创建 log 目录，从不创建 `bin/`**。
新装机器上必须手工放入：

```
/usr/local/x-ui/bin/xray-linux-amd64    (36.5 MB)
/usr/local/x-ui/bin/geoip.dat           (19.7 MB)
/usr/local/x-ui/bin/geosite.dat         (10.5 MB)
```

否则日志会刷满 `Failed to write configuration file: open bin\.config-*.tmp: The system cannot find the path specified.`
（历史上曾刷出 4350 条）

### 3. **acme.sh 不要用 `--keylength ec`**

裸的 `ec` 不是合法值，会导致：
```
Error encountered for ECC key named ec
Cannot create domain key
```
**正确做法**：不传 `--keylength`（acme.sh 3.x 默认就是 `ec-256`），或写 `--keylength ec-256`。

### 4. **改 x-ui 设置时，`UPDATE` 可能静默失效**

`settings` 表的 `key` 列**只有普通索引，没有 UNIQUE 约束**（`internal/database/model/model.go:769`）。
而且**某些键（如 `webListen`）在新装机器上根本不存在对应行**，`UPDATE ... WHERE key='webListen'` 会匹配 0 行、**静默什么都不做**。

**可靠写法**：
```sql
DELETE FROM settings WHERE key='webListen';
INSERT INTO settings (key,value) VALUES ('webListen','127.0.0.1');
```

### 5. **面板证书必须清空（方案 ② 的前提）**

面板在 nginx 后面时，**自身不能再有证书**，否则形成双层 TLS，浏览器直接打不开。

而且**不能**用 `x-ui setting -webCert "" -webCertKey ""` 清空 —— `main.go:700` 的判断是：
```go
if webCertFile != "" || webKeyFile != "" {   // 空字符串进不来
    updateCert(webCertFile, webKeyFile)
}
```
只能直接改数据库（见坑 4 的写法）。

### 6. **新服务必须绑 `127.0.0.1`**

面板曾因 `webListen` 缺失而绑定 `*:2087`，**明文 HTTP 直接暴露在公网**。
网站也必须 `127.0.0.1:8080`，靠 nginx 对外。

### 7. **不要在服务器上编译**

2 核 / 967 MB，编译 Go 要 10-30 分钟且极易 OOM。**一律本地交叉编译后 scp**。

### 8. **磁盘与内存都要省**

- 图片存外链，不存服务器
- 用 SQLite，**不要装 MySQL / PostgreSQL**
- 不要装宝塔 / 1Panel 等一键面板（会抢 443、重写 iptables，直接搞死 VPN）

---

## 7. 待办事项

### 服务器侧（用户还没做）

- [ ] **换掉暴露的阿里云 AccessKey**（曾在聊天里明文出现，需去 RAM 控制台禁用重建）
- [ ] **改掉面板默认密码**：`/usr/local/x-ui/x-ui setting -username <新用户名> -password '<强密码>' && systemctl restart x-ui`
      （重启会短暂断开 VPN 约 2 秒）
- [ ] **`/swapfile` 写进 `/etc/fstab`**：`echo '/swapfile none swap sw 0 0' >> /etc/fstab`
- [ ] 考虑随机化 `webBasePath`（面板现在挂在 `/`）
- [ ] 面板开启 2FA

### 网站侧（下一步要做的）

- [ ] **向用户索取数据文件**（格式、位置、样例、条数）
- [ ] 搭 Go + SQLite 骨架
- [ ] 搭 Vite + React + AntD 前端（樱花主题）
- [ ] 写导入脚本
- [ ] 写 systemd 单元 + 部署脚本
- [ ] 部署到 `/opt/prompts/`，监听 `127.0.0.1:8080`
- [ ] 验证 `https://prompts.kanbekotori.top` 可访问

---

## 8. 服务器上的备份文件

| 路径 | 内容 |
|---|---|
| `/root/x-ui.db.bak.<日期>` | 面板数据库备份 |
| `/root/acme-old-backup/` | 旧证书目录（可删） |
| `/root/iptables-before.txt` | 改动前的 iptables（如果创建过） |

### 回滚方案（把面板恢复到 443）

```bash
systemctl stop nginx
cp /root/x-ui.db.bak.<日期> /etc/x-ui/x-ui.db
systemctl start x-ui
```

---

## 9. 上游代码参考位置（本地 Windows）

面板仓库在 **`F:\REPO\3xui`**，几处相关代码：

| 文件 | 用途 |
|---|---|
| `internal/xray/process.go:129-136` | xray 二进制名 / `bin` 目录路径 |
| `internal/web/web.go:556-598` | 面板监听地址 + **TLS 加载失败会静默降级成 HTTP** |
| `main.go:266-270` | `setting -show` 只判断证书存在与否，不打印路径 |
| `main.go:700-701` | `updateCert` 的成对参数判断 |
| `internal/database/model/model.go:24-36` | 协议枚举 |
| `internal/database/model/model.go:767-771` | `Setting` 表结构 |
| `frontend/src/hooks/useTheme.tsx` | 樱花主题配色 |
| `frontend/src/styles/sakura.css` | 樱花飘落动画 |
| `frontend/src/components/SakuraLayer.tsx` | 花瓣组件 |

---

## 10. 用户偏好

- 中文交流
- 喜欢**分步走、每步验证**，一次给一个可执行块
- 会直接把终端输出贴过来
- 技术背景能看懂命令，但不是专业运维 —— **解释原因比只给命令更重要**
- 服务器操作用 root，命令直接给完整路径
