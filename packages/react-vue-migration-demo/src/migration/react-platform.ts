import type { NavigateFunction } from 'react-router-dom'
import { migrationLog } from '../shared/migration-log'
import type { MigrationPlatform } from './platform'

export function createReactMigrationPlatform(navigate: NavigateFunction): MigrationPlatform {
  return {
    router: {
      push(path) {
        migrationLog.append({ source: 'React Platform', message: `navigate('${path}')` })
        navigate(path)
      },
      replace(path) {
        migrationLog.append({ source: 'React Platform', message: `replace('${path}')` })
        navigate(path, { replace: true })
      },
      back() {
        migrationLog.append({ source: 'React Platform', message: 'navigate(-1)' })
        navigate(-1)
      },
    },
  }
}
