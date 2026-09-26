import { spawnSync } from 'node:child_process'

const baseImages = ['node:22.14.0-alpine', 'nginx:1.27.3-alpine']

function run(command, args, options = {}) {
  return spawnSync(command, args, { stdio: 'inherit', ...options })
}

for (const image of baseImages) {
  const local = spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' })

  if (local.status === 0) {
    console.log(`[docker] 使用本地基础镜像：${image}`)
    continue
  }

  console.log(`[docker] 本地缺少基础镜像，开始拉取：${image}`)
  const pull = run('docker', ['pull', image])

  if (pull.error || pull.status !== 0) {
    console.error(`[docker] 拉取失败：${image}`)
    console.error('[docker] 请检查 Docker Desktop 的网络、代理或 Registry Mirror 配置。')
    process.exit(pull.status ?? 1)
  }
}

const build = run('docker', ['build', '-f', 'infra/Dockerfile', '-t', 'blog-web:local', '.'])

if (build.error) {
  console.error(build.error.message)
}

process.exit(build.status ?? 1)
