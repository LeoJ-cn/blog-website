name: CI

on:
pull_request:
push:
branches: - master - feature/v2-blog-website

permissions:
contents: read

concurrency:
group: ci-${{ github.workflow }}-${{ github.ref }}
cancel-in-progress: true

jobs:
validate:
runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.5
          run_install: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # 当前技术组件目录暂不纳入类型检查，待组件正式接入后恢复。

      - name: Build Vite
        run: pnpm build:vite

      - name: Build Webpack
        run: pnpm build:webpack
