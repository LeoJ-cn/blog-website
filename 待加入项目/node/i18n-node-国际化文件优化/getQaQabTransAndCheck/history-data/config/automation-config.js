const pathConfig = require('./pathList.json')
const lodash = require('lodash')

const comparedPath = []
lodash.map(pathConfig, (qaPath, featureName) => {
  // const qabPath = qaPath.replace('qa-ana', 'qab-ana');
  const qabPath = qaPath.replace('qa-ana', 'ci-ana')
  comparedPath.push({
    featureName,
    qa: qaPath,
    qab: qabPath,
  })
})

const zxjAccount = {
  account: 'zxjnname@pat.com',
  password: 'zxj111111',
}

const zmAccount = {
  account: 'zhouman@pat.com',
  password: 'zhouman1234',
}

module.exports = {
  language: 'cn',
  //账号
  accountInfo: {
    qa: {
      baseUrl: 'http://qa-ana.zhy.com/language/set?language=',
      ...zmAccount,
    },
    qab: {
      baseUrl: 'http://ci-ana.zhy.com/language/set?language=',
      ...zmAccount,
    },
    ci: {
      baseUrl: 'http://ci-ana.zhy.com/language/set?language=',
      ...zmAccount,
    },
  },
  comparedPath,
}
