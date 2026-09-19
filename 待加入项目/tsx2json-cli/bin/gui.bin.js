#!/usr/bin/env node

const { Command } = require('commander')
const program = new Command()
const pkgJson = require('../package.json')

program.version(pkgJson.version, '--version, -V', '当前gui-cli的版本')

program
  .command('tsx2json')
  .option('-c --conversion <fileFath>', '*.tsx => *.schema.json 转译单个文件')
  .option('-ca --conversion-all  <folderFath>', '*.tsx => *.schema.json 转译目录下所有tsx文件')
  .description('tsx 转换成 schema')
  .action((conf) => {
    const { tsx2jsonFromCli } = require('../dist/gui.cjs.js')
    tsx2jsonFromCli(conf)
  })

program.parse()
