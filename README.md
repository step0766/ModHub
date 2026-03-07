# ModHub - MakerWorld 本地归档工具

![ModHub](https://aliyun-wb-h9vflo19he.oss-cn-shanghai.aliyuncs.com/use/makerworld_archive.png)

一个功能强大的 MakerWorld 模型本地归档工具，支持模型采集、离线页面生成、模型库浏览、缺失 3MF 重试，以及浏览器插件一键归档。

> 原版地址：https://github.com/sonicmingit/mw_archive_py

## ✨ 功能特性

### 核心功能
- 📦 **模型归档** - 一键归档 MakerWorld 模型到本地，包括图片、3MF 文件、元数据
- 🌐 **离线浏览** - 生成独立的 HTML 页面，无需网络即可查看模型详情
- 🔄 **缺失重试** - 自动记录下载失败的 3MF 文件，支持一键重试
- 🔌 **浏览器插件** - 支持 Chrome 扩展和油猴脚本，实现一键归档

### 界面优化（自定义版特有）
- 🎨 **卡片交互优化** - 默认简洁显示，悬停展开详情，平滑过渡动画
- 🌓 **主题切换** - 支持浅色/暗黑模式，自动检测系统偏好，状态持久化
- ✅ **自定义对话框** - 美化的模态对话框，替代浏览器默认样式
- 📋 **批量操作** - 支持多选批量删除模型
- 📌 **侧边栏优化** - 可收缩/展开，状态持久化
- ⚠️ **归档失败提示** - 卡片上显示红色提示框，直观展示失败状态

### 性能优化（自定义版特有）
- ⚡ **并发下载** - 5 线程并发下载，速度提升 3-5 倍
- 🍪 **Cookie 分离** - 国内/国际平台 Cookie 分离配置，自动选择

## 📊 与原版对比

| 功能 | 原版 | 自定义版 |
|------|------|----------|
| 卡片显示 | 默认显示完整信息 | 默认简洁显示，悬停展开详情 |
| 确认对话框 | 浏览器默认对话框 | 美化的自定义模态对话框 |
| 归档失败提示 | 无 | 卡片上显示红色提示框 |
| 批量删除 | 无 | 支持多选批量删除 |
| 侧边栏 | 固定宽度 | 可收缩/展开 |
| 主题切换 | 无 | 浅色/暗黑模式切换 |
| 下载方式 | 单线程串行 | 5 线程并发 |
| Cookie 配置 | 单一 Cookie | 国内/国际平台分离 |
| 删除清理 | 手动清理缺失记录 | 自动清理 |

## 🚀 快速开始

### Docker 运行（推荐）

```bash
# 拉取镜像
docker pull step0766/modhub:latest

# 运行容器
docker run -d \
  --name modhub \
  -p 8000:8000 \
  -v ./config:/app/config \
  -v ./data:/app/data \
  -v ./logs:/app/logs \
  step0766/modhub:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  modhub:
    image: step0766/modhub:latest
    container_name: modhub
    ports:
      - "8000:8000"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
```

### 本地运行

```bash
# 克隆项目
git clone https://github.com/step0766/ModHub.git
cd ModHub/app

# 创建虚拟环境
python -m venv .venv
. .venv/Scripts/activate  # Windows
# source .venv/bin/activate  # Linux/macOS

# 安装依赖
pip install -r requirements.txt

# 启动服务
python server.py
```

## 📁 目录结构

```
ModHub/
├── app/                    # 核心应用
│   ├── server.py           # 主服务器
│   ├── archiver.py         # 归档逻辑
│   ├── three_mf_parser.py  # 3MF 解析
│   ├── config/             # 配置目录（需挂载）
│   ├── data/               # 数据目录（需挂载）
│   ├── logs/               # 日志目录（需挂载）
│   ├── static/             # 静态资源
│   └── templates/          # HTML 模板
├── plugin/                 # 浏览器插件
│   ├── chrome_extension/   # Chrome 扩展
│   └── tampermonkey/       # 油猴脚本
├── Dockerfile
└── README.md
```

## 🔧 配置说明

### Cookie 配置

访问 http://localhost:8000/config 配置 Cookie：

- **国内平台 Cookie** - 用于 makerworld.com.cn
- **国际平台 Cookie** - 用于 makerworld.com

系统会根据归档 URL 自动选择对应平台的 Cookie。

### 目录挂载

| 目录 | 说明 |
|------|------|
| `/app/config` | 配置文件（Cookie、设置等） |
| `/app/data` | 归档的模型数据 |
| `/app/logs` | 运行日志 |

## 🌐 访问地址

- **模型库**：http://localhost:8000
- **配置页**：http://localhost:8000/config
- **模型详情**：http://localhost:8000/model/{model_dir}

## 📦 浏览器插件

### 油猴脚本

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 安装脚本：[mw_quick_archive.user.js](plugin/tampermonkey/mw_quick_archive.user.js)
3. 在 MakerWorld 模型页面点击「归档模型」按钮

### Chrome 扩展

详见 [plugin/chrome_extension/README.md](plugin/chrome_extension/README.md)

## 📝 更新日志

### v1.0.0
- 初始发布
- 模型归档、离线浏览、缺失重试
- 界面优化：卡片交互、主题切换、批量操作
- 性能优化：并发下载、Cookie 分离

## 📄 License

MIT License

## 🙏 致谢

- 原版项目：[sonicmingit/mw_archive_py](https://github.com/sonicmingit/mw_archive_py)
