import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rootPackage = readPackage(join(repositoryRoot, 'package.json'))
const expectedVersion = rootPackage.pnpm?.overrides?.vite

if (typeof expectedVersion !== 'string' || expectedVersion.length === 0) {
  fail('根 package.json 必须通过 pnpm.overrides.vite 声明统一的 Vite 精确版本。')
}

const declarationErrors = findWorkspacePackageFiles(repositoryRoot).flatMap(
  (packageFile) => {
    const packageJson = readPackage(packageFile)
    const dependencyGroups = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]

    return dependencyGroups.flatMap((group) => {
      const declaredVersion = packageJson[group]?.vite

      if (declaredVersion === undefined || declaredVersion === expectedVersion) {
        return []
      }

      return [
        `${packageJson.name ?? packageFile} 在 ${group}.vite 中声明了 ${declaredVersion}，应为 ${expectedVersion}。`,
      ]
    })
  },
)

if (declarationErrors.length > 0) {
  fail(declarationErrors.join('\n'))
}

// manifest 一致仍不代表传递依赖一致，因此继续检查 pnpm 实际解析出的完整依赖树。
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const listResult = spawnSync(
  pnpmCommand,
  ['list', '-r', 'vite', '--depth', 'Infinity', '--json'],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
  },
)

if (listResult.status !== 0) {
  fail(listResult.stderr || '无法读取 pnpm Vite 依赖树。')
}

const resolvedVersions = new Set()
collectResolvedViteVersions(JSON.parse(listResult.stdout), resolvedVersions)

if (resolvedVersions.size === 0) {
  fail('pnpm 依赖树中未找到 Vite，请先执行 pnpm install。')
}

const unexpectedVersions = [...resolvedVersions].filter(
  (version) => version !== expectedVersion,
)

if (unexpectedVersions.length > 0) {
  fail(
    `pnpm 依赖树存在非统一 Vite 版本：${unexpectedVersions.join(', ')}；期望 ${expectedVersion}。`,
  )
}

console.log(`Vite 版本一致：${expectedVersion}`)

function findWorkspacePackageFiles(root) {
  return ['apps', 'packages'].flatMap((workspaceDirectory) => {
    const directory = join(root, workspaceDirectory)

    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(directory, entry.name, 'package.json'))
      .filter((packageFile) => existsSync(packageFile))
  })
}

function readPackage(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function collectResolvedViteVersions(value, versions) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectResolvedViteVersions(item, versions))
    return
  }

  if (value === null || typeof value !== 'object') {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      key === 'vite' &&
      nestedValue !== null &&
      typeof nestedValue === 'object' &&
      typeof nestedValue.version === 'string'
    ) {
      versions.add(nestedValue.version)
    }

    collectResolvedViteVersions(nestedValue, versions)
  }
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
