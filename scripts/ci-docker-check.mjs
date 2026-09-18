import { spawnSync } from 'node:child_process'

const image = process.env.CI_DOCKER_IMAGE || 'blog-web:ci-local'
const result = spawnSync('docker', ['build', '--target', 'ci', '-f', 'infra/Dockerfile', '-t', image, '.'], {
  stdio: 'inherit',
})

if (result.error) {
  console.error('无法执行 Docker。请确认 Docker Desktop 或 Docker Engine 已启动。')
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
