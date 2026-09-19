const puppeteer = require('puppeteer');
const fs = require('fs');
const lodash = require('lodash');
const exec = require('child_process').exec;

const options = {
    width: 1350,
    height: 840
};
const pptrLanchConfig = {
    headless: false, //true:打开chromium(无界面)   , false:浏览器模式
    timeout: 0,
    args: [`--window-size=${options.width},${options.height}`],
    defaultViewport: null
};

const config = require('./config/automation-config');
const { comparedPath } = config;
const folderName = 'pageTexts';
const qaAccount = config.accountInfo.qa;
const qabAccount = config.accountInfo.qab;

const targetPageName = 'targetPage';
const initWirtePath = `./${folderName}/`;

const runningStartTime = (new Date()).getTime();

//检查文件夹
if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
}


function replaceSpace(str) {
    return str.replace(new RegExp('(\\s+)', 'igm'), '  ');
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
    await qaLoginPage.goto(`${qaAccount.baseUrl}${config.language}`);
    await qaLoginPage.waitFor('.login-title');
    //自动登录
    await qaLoginPage.type('#acount', qaAccount.account, { delay: 50 });
    await qaLoginPage.type('#password', qaAccount.password, { delay: 50 });
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


    console.log('qab login: start \nWaiting......');
    const browser2 = await puppeteer.launch(pptrLanchConfig);
    const qabLoginPage = await browser2.newPage();
    //设置语言
    await qabLoginPage.goto(`${qabAccount.baseUrl}${config.language}`);
    await qabLoginPage.waitFor('.login-title');
    //自动登录
    await qabLoginPage.type('#acount', qabAccount.account, { delay: 50 });
    await qabLoginPage.type('#password', qabAccount.password, { delay: 50 });
    qabLoginPage.click('#log-button');
    await qabLoginPage.waitFor(2000);


    //若显示重复登录，则点击确认
    try {
        const configmBtn = await qabLoginPage.$('button.confirm');
        if (configmBtn) {
            qabLoginPage.click('button.confirm');
        }
        await qabLoginPage.waitFor(1000);
    } catch {
        console.log('无需确认');
    }
    console.log('qab login: Done!!!\n');


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
            const varPage = `${targetPageName}${count}`;
            const source = {
                featureName: pathConfig.featureName,
                url: {
                    qa: pathConfig.qa,
                    qab: pathConfig.qab,
                },
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
            // await source.qaPage.waitFor(1000);
            console.log(`Checking ${pathConfig.featureName} at qab: ${pathConfig.qab}`);
            source.qabPage = await browser2.newPage();
            await source.qabPage.goto(pathConfig.qab, pageGoConfig);
            // await source.qabPage.waitFor(1000);
            console.log(`Open ${pathConfig.featureName}: Done!!!\n`);
            //已经打开所有页面， 睡眠等待
            if (count === featurePathList.length - 1) {
                await source.qabPage.waitFor(3000);
            }
        }

        /**
         * 打开所有页面之后， 设置睡眠时间， 然后获取所有的html
         */
        for (let key in pageCache) {
            const currentPage = pageCache[key];
            const { writePath, featureName, url } = currentPage;
            const qaText = await currentPage.qaPage.evaluate(() => {
                return document.querySelector('body').textContent;
            });
            const qabText = await currentPage.qabPage.evaluate(() => {
                return document.querySelector('body').textContent;
            });

            //释放内存
            currentPage.qaPage.close();
            currentPage.qabPage.close();

            const contentData = {
                featureName,
                url,
                qaText: replaceSpace(qaText),
                qabText: replaceSpace(qabText)
            };
            try {
                fs.writeFileSync(writePath, JSON.stringify(contentData, null, 4), 'utf8');
                console.log(`${writePath}: File has been updated~~~~`);
            } catch (err) {
                console.log(`${writePath}: An error occured while writing JSON Object to File.`);
            }
        }
        //关闭窗口
        await pageCache.targetPage0.qaPage.waitFor(1000);
    }


    browser.close();
    browser2.close();
    const runningEndtime = (new Date()).getTime();
    console.log(`\nPROGREM END: 执行时长${(runningEndtime - runningStartTime) / 1000}秒`);

    //生成文本对比
    exec('node ./generate-html.js', function() {
        console.log('已完成：文本对比！！！');
    });

};
autoRun();
