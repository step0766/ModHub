# ModHub - MakerWorld 本地归档小应用

![MakerWorld Archive](https://aliyun-wb-h9vflo19he.oss-cn-shanghai.aliyuncs.com/use/makerworld_archive.png)

一个用于归档 MakerWorld 模型到本地的项目，支持模型采集、离线页面生成、模型库浏览、缺失 3MF 重试，以及浏览器插件一键归档。

原版地址：https://github.com/sonicmingit/mw_archive_py

## 功能特性

### 模型管理
- **模型采集**：一键归档 MakerWorld 模型到本地
- **离线浏览**：生成离线 HTML 页面，无需网络即可查看
- **批量操作**：支持多选批量删除模型
- **相似度排序**：基于标题相似度自动分组排列相似模型

### 界面设计
- **响应式布局**：完美适配桌面端和移动端
- **浅色/暗黑主题**：一键切换，自动检测系统偏好
- **磨砂玻璃效果**：现代化的 UI 设计语言
- **平滑动画**：流畅的交互动画效果

### 热门关键词
- **智能提取**：自动从模型标题中提取高频关键词
- **关键词屏蔽**：支持屏蔽不感兴趣的关键词
- **快速搜索**：点击关键词即可搜索相关模型

### 性能优化
- **并发下载**：5 线程并发，速度提升 3-5 倍
- **Cookie 分离**：支持国内版和国际版 Cookie 分开配置

## 快速开始

## Docker Compose 启动（推荐）
创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  modhub:
    image: step0766/modhub:latest
    container_name: modhub
    ports:
      - "8000:8000"
    volumes:
      - ./app/data:/app/data
      - ./app/logs:/app/logs
      - ./app/config:/app/config
    restart: unless-stopped
```

### Docker 部署

```bash
docker pull step0766/modhub:latest
docker run -d -p 8000:8000 -v ./data:/app/data -v ./config:/app/config step0766/modhub
```

### 本地运行

```bash
git clone https://github.com/step0766/ModHub.git
cd ModHub/app
pip install -r requirements.txt
python server.py
```

访问 http://localhost:8000 即可使用。

## 配置

首次运行后，访问 http://localhost:8000/config 进行配置：

1. 设置下载目录
2. 配置 MakerWorld Cookie（用于归档模型）
3. 设置日志目录

## 版本历史

### v1.1.0 (2025-03-10)
- ✨ 新增热门关键词功能，自动提取模型标题高频词
- ✨ 支持关键词屏蔽，屏蔽后自动补位新关键词
- 🎨 侧边栏磨砂玻璃效果
- 🎨 下拉菜单磨砂玻璃效果
- 🎨 移动端模型卡片标题显示优化
- 🐛 修复模型详情页主题切换不同步问题
- 🐛 修复移动端热门关键词折叠功能

### v1.0.0
- 初始版本发布
- 模型采集与归档
- 离线页面生成
- 浅色/暗黑主题切换
- 批量删除功能
- 相似度排序

## 与原版的区别

| 功能 | 原版 | ModHub |
|------|------|--------|
| 卡片显示 | 默认显示完整信息 | 默认简洁显示，悬停展开详情 |
| 确认对话框 | 浏览器默认对话框 | 美化的自定义模态对话框 |
| 归档失败提示 | 无 | 卡片上显示红色提示框 |
| 批量删除 | 无 | 支持多选批量删除 |
| 侧边栏 | 固定宽度 | 可收缩/展开，磨砂玻璃效果 |
| 主题切换 | 无 | 浅色/暗黑模式切换 |
| 下载方式 | 单线程串行 | 5 线程并发 |
| 删除清理 | 手动清理缺失记录 | 自动清理 |
| 相似度排序 | 无 | 支持模型相似度倒序排序 |
| 热门关键词 | 无 | 自动提取高频关键词，支持屏蔽 |

## 相关链接

- [Docker Hub](https://hub.docker.com/r/step0766/modhub)
- [GitHub Repository](https://github.com/step0766/ModHub)

## License

MIT License
