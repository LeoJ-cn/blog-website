# Docker CI 模拟

`infra/Dockerfile` 提供两个验证目标：

- `runtime`：构建 Vite 产物并用 Nginx 托管
- `ci`：模拟 GitHub Actions 的 Node、pnpm、冻结锁文件、Vite 构建和 Webpack 构建

本地执行 CI 模拟：

```bash
cd /Users/leojm5/Documents/company/blog-website
pwd
pnpm verify:ci:docker
```

仅构建并运行静态站点镜像：

```bash
cd /Users/leojm5/Documents/company/blog-website
pwd
pnpm build:docker
docker run --rm -p 8080:80 blog-web:local
```

`pnpm build:docker` 会先检查本地是否已有固定版本的 Node 和 Nginx 基础镜像。本地存在时直接复用；不存在时才执行 `docker pull`。拉取失败时脚本会立即停止，不再继续构建。

当前 `apps/web/src/components` 目录属于后续技术清单，Docker CI 暂不执行 `pnpm typecheck`。CI 模拟使用 Linux Alpine 环境，因此可以提前暴露本机 macOS 环境未发现的路径大小写、原生模块和冻结锁文件问题。它不会执行 GitHub Pages 部署。
