import { readFileSync } from 'node:fs'

const messageFile = process.argv[2]
const message = messageFile ? readFileSync(messageFile, 'utf8').trim() : ''
const conventionalCommit = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?: .+/

if (message && !conventionalCommit.test(message.split('\n', 1)[0])) {
  console.warn('\n[commit convention] 提交信息建议使用 Conventional Commits，例如：')
  console.warn('  feat(web): add runtime monitoring\n')
}

// 当前阶段仅提示，不阻断提交。
process.exit(0)
