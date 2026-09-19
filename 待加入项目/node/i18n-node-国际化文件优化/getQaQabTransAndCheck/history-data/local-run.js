const puppeteer = require('puppeteer');
const fs = require('fs');
const lodash = require('lodash');

const pptrLanchConfig = {
    headless: false, //true: chromium(无界面)   , false:浏览器模式
    timeout: 0
};

const config = require('./config/automation-config');
const { comparedPath } = config;
const folderName = 'checkLostKey';
const writePath = `${folderName}/lostKeys.json`;

const targetPageName = 'targetPage';
const initWirtePath = `./${folderName}/`;

const runningStartTime = (new Date()).getTime();

//检查文件夹
if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
}


let autoRun = async () => {
    console.log('\nPROGREM START\n');
    const browser = await puppeteer.launch(pptrLanchConfig);

    /**
     *   登录qa、qab
     */
    console.log('qa login: start \nWaiting......');
    const qaLoginPage = await browser.newPage();
    //设置语言
    // await qaLoginPage.goto(`http://qa-ana.zhy.com/language/set?language=${config.language}`);
    // await qaLoginPage.goto(`http://127.0.0.1:4567/language/set?language=${config.language}`);
    await qaLoginPage.goto(`http://ci-ana.zhy.com/language/set?language=${config.language}`);
    // await qaLoginPage.goto(`https://ana.zhy.com/language/set?language=${config.language}`);
    await qaLoginPage.waitFor('.login-title');

    /**
     * 自动登录
    */

    await qaLoginPage.type('#acount', 'zxjnname@pat.com', { delay: 50 });
    await qaLoginPage.type('#password', 'zxj111111', { delay: 50 });

    // await qaLoginPage.type('#acount', 'patfuncb@pat.com', { delay: 50 });
    // await qaLoginPage.type('#password', 'pat123456', { delay: 50 });

    // await qaLoginPage.type('#acount', 'zhouman@pat.com', { delay: 50 });
    // await qaLoginPage.type('#password', 'zhouman1234', { delay: 50 });


    qaLoginPage.click('#log-button');
    await qaLoginPage.waitFor(2000);


    //若显示重复登录，则点击确认
    try {
        const qaconfigmBtn = await qaLoginPage.$('button.confirm');
        if (qaconfigmBtn) {
            qaLoginPage.click('button.confirm');
        }
        await qaLoginPage.waitFor(1000);
    } catch {
        console.log('无需确认');
    }
    console.log('qa login: Done!!!\n');

    /**
     * 批量打开页面: 每5个功能一组， 记录之后， 关闭窗口释放内存
    */
    const eachArray = lodash.chunk(comparedPath, 5);
    let pageCache = {};
    for (let splitNum = 0; splitNum < eachArray.length; splitNum++) {
        const featurePathList = eachArray[splitNum];
        pageCache = {};
        for (let count = 0; count < featurePathList.length; count++) {
            const pathConfig = featurePathList[count];
            pathConfig.qa = pathConfig.qa.replace('http://qa-ana.zhy.com', 'http://ci-ana.zhy.com');
            // pathConfig.qa = pathConfig.qa.replace('http://qa-ana.zhy.com', 'https://ana.zhy.com');
            const varPage = `${targetPageName}${count}`;
            const source = {
                featureName: pathConfig.featureName,
                writePath: `${initWirtePath + pathConfig.featureName}.json`
            };
            const pageGoConfig = {
                waitUntil: 'networkidle2'
            };
            pageCache[varPage] = source;
            console.log(`Open ${pathConfig.featureName}: start \nWaiting......`);
            source.qaPage = await browser.newPage();
            console.log(`Checking ${pathConfig.featureName} at qa: ${pathConfig.qa}`);
            await source.qaPage.goto(pathConfig.qa, pageGoConfig);
            await source.qaPage.waitFor(1000);

            //已经打开所有页面， 睡眠等待
            if (count === featurePathList.length - 1) {
                await source.qaPage.waitFor(5000);
            }
        }

        /**
         * 打开所有页面之后， 设置睡眠时间， 然后获取所有的html
         */
        for (let key in pageCache) {
            const currentPage = pageCache[key];
            const localStorageData = await currentPage.qaPage.evaluate(() => {
                let json = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    json[key] = localStorage.getItem(key);
                }
                return json['aaaa-i18n-test-recorder-list'] || '{}';
            });

            //释放内存
            currentPage.qaPage.close();

            try {
                fs.writeFileSync(writePath, JSON.stringify(JSON.parse(localStorageData), null, 4), 'utf8');
                console.log(`${writePath}: File has been updated~~~~`);
            } catch (err) {
                console.log(`${writePath}: An error occured while writing JSON Object to File.`);
            }
        }
        //关闭窗口
        await pageCache.targetPage0.qaPage.waitFor(1000);
    }


    browser.close();
    const runningEndtime = (new Date()).getTime();
    console.log(`\nPROGREM END: 执行时长${(runningEndtime - runningStartTime) / 1000}秒`);
};
autoRun();
