import { tsx2json, tsx2jsonFromCli } from './tsx2json/_generate/tsx2json'
import { getComments } from './tsx2json/_generate/ast'

debugger
// node -r  ts-node/register  --inspect-brk  /Users/zm/Documents/personal-project/monorepo-leo/packages/tsx2json-cli/src/main.ts
// node -r  ts-node/register  /Users/zm/Documents/personal-project/monorepo-leo/packages/tsx2json-cli/src/main.ts
tsx2json(
  '/Users/zm/Documents/company-project/yuerwang/yuer-bug/repo_13a3fd5c84e946508021e607cfa4afdf/packages/gui/components/editor/common/properties-edit/new-components/component-attr/IconSelect.tsx',
)

export { getComments, tsx2json, tsx2jsonFromCli }
