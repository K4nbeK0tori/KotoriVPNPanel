<div align="center">

# 🌸 KotoriVPN Panel

**二次元樱花风格的代理管理面板** · 基于 [3x-ui](https://github.com/MHSanaei/3x-ui)

💖 保留 3x-ui 的全部功能，披上粉色樱花皮 💖

![License](https://img.shields.io/badge/license-GPLv3-blue)
![Xray](https://img.shields.io/badge/xray--core-26.x-orange)
![Go](https://img.shields.io/badge/Go-1.27-00ADD8)
![React](https://img.shields.io/badge/React-19-61dafb)

</div>

---

## ✨ 特性

- 🌸 **樱花粉萌系主题**：亮色 / 暗色 / 极致暗色三套粉嫩配色
- 🧝 **登录页看板娘**：透明底角色立绘站在登录卡片旁，轻轻浮动
- 🌸 **樱花花瓣飘落**：登录页与面板共享的 GPU 轻量动画（`transform3d`，低端设备也不卡）
- 🖼️ **全屏插画背景**：登录页与面板各自的全屏粉色插画背景
- 🔘 **樱花特效开关**：侧边栏 / 登录页一键开关，默认开启，状态自动保存
- ✏️ **品牌定制**：KotoriVPN 品牌名（侧边栏 / 登录页 / 浏览器标题）
- ⚡ **完整保留 3x-ui 功能**：多协议入站、流量统计、订阅、多节点、Telegram Bot、i18n 等

## 🖼️ 截图

> 将你的面板截图放入 `media/` 目录并在下方引用

| 登录页 | 面板 |
| :---: | :---: |
| <img src="media/login.png" width="400"/> | <img src="media/panel.png" width="400"/> |

## 🚀 部署（Debian / Ubuntu）

已有 3x-ui 的服务器**只需替换二进制**，数据库与配置全部保留：

```bash
# ① 备份（重要！）
systemctl stop x-ui
cp -r /etc/x-ui /root/x-ui-backup-$(date +%F)
cp /usr/local/x-ui/x-ui /usr/local/x-ui/x-ui.bak

# ② 安装构建工具
apt update && apt install -y gcc curl
curl -L https://go.dev/dl/go1.27.0.linux-amd64.tar.gz | tar -C /usr/local -xzf -
export PATH=$PATH:/usr/local/go/bin

# ③ 上传源码压缩包并解压
mkdir -p /opt/3x-ui && tar -xzf kotori-build.tar.gz -C /opt/3x-ui
cd /opt/3x-ui

# ④ 编译（已包含构建好的前端 dist，无需 Node）
export GOPROXY=https://goproxy.cn,direct
go build -o x-ui .

# ⑤ 替换并启动
cp x-ui /usr/local/x-ui/x-ui && chmod +x /usr/local/x-ui/x-ui
systemctl start x-ui
systemctl status x-ui
```

> 💡 小内存 VPS（1G 左右）建议先加 swap 再编译：
> `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`

## 🛠️ 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19 · Ant Design 6 · Vite 8 · TypeScript |
| 后端 | Go 1.27 · Gin · GORM · SQLite/PostgreSQL |
| 内核 | Xray-core（多协议）· MTProto · AmneziaWG |

## 📂 主要目录

```
frontend/          # React 前端（樱花主题在这里）
internal/web/      # Gin 后端与面板 API
internal/database/ # GORM 模型与迁移
internal/xray/     # Xray 子进程管理
```

## 📜 致谢

- [3x-ui](https://github.com/MHSanaei/3x-ui) —— 本项目的上游基础
- [Xray-core](https://github.com/XTLS/Xray-core) —— 代理内核

<div align="center">

---
Made with 💖 and 🌸

</div>
