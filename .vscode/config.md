## vue2

.vscode/settings.json
{
"js/ts.tsdk.path": "node_modules/typescript/lib",

// Vue 2
"vetur.validation.script": true,
"vetur.validation.template": true,
"vetur.validation.style": true,
"vetur.format.enable": false,

// ESLint
"eslint.workingDirectories": [{ "mode": "auto" }],
"eslint.validate": [
"javascript",
"javascriptreact",
"typescript",
"typescriptreact",
"vue"
],

"editor.codeActionsOnSave": {
"source.fixAll.eslint": "explicit"
},

// Prettier
"prettier.requireConfig": true,
"editor.formatOnSave": true,

"[vue]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[javascript]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[typescript]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},

// Files
"files.eol": "\n",
"files.trimTrailingWhitespace": true,
"files.insertFinalNewline": true,
"files.trimFinalNewlines": true,

"search.exclude": {
"**/node_modules": true,
"**/dist": true,
"\*\*/coverage": true
},

"typescript.updateImportsOnFileMove.enabled": "always",
"javascript.updateImportsOnFileMove.enabled": "always"
}
.vscode/extensions.json
{
"recommendations": [
// Vue 2
"octref.vetur",
// 工程通用
"dbaeumer.vscode-eslint",
"esbenp.prettier-vscode"
],

// Vue 3 专用：不允许在该项目使用
"unwantedRecommendations": [
"Vue.volar"
]
}

## vue3

.vscode/settings.json
{
// TypeScript
"js/ts.tsdk.path": "node_modules/typescript/lib",

// Vue 3 / Volar
// 禁用 Vetur 能力，避免和 Vue - Official 冲突
"vetur.validation.script": false,
"vetur.validation.template": false,
"vetur.validation.style": false,
"vetur.format.enable": false,

// ESLint
"eslint.workingDirectories": [{ "mode": "auto" }],
"eslint.validate": [
"javascript",
"javascriptreact",
"typescript",
"typescriptreact",
"vue"
],

"editor.codeActionsOnSave": {
"source.fixAll.eslint": "explicit"
},

// Prettier
"prettier.requireConfig": true,

"editor.formatOnSave": true,

"[vue]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[javascript]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[typescript]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[json]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[jsonc]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[css]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},
"[scss]": {
"editor.defaultFormatter": "esbenp.prettier-vscode"
},

// Files
"files.eol": "\n",
"files.trimTrailingWhitespace": true,
"files.insertFinalNewline": true,
"files.trimFinalNewlines": true,

"files.exclude": {
"**/.git": true,
"**/.DS_Store": true,
"**/dist": true,
"**/dist-vite": true,
"\*\*/dist-webpack": true
},

"search.exclude": {
"**/node_modules": true,
"**/dist": true,
"**/dist-vite": true,
"**/dist-webpack": true,
"\*\*/coverage": true
},

// TS / JS
"typescript.updateImportsOnFileMove.enabled": "always",
"javascript.updateImportsOnFileMove.enabled": "always"
}

.vscode/extensions.json
{
"recommendations": [
"Vue.volar",
"dbaeumer.vscode-eslint",
"esbenp.prettier-vscode"
],
"unwantedRecommendations": [
"octref.vetur"
]
}
