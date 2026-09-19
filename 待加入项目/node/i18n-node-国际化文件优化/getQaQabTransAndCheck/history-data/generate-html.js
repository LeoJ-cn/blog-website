
const fs = require('fs');
const lodash = require('lodash');
const fastDiff = require('fast-diff');
const path = require('path');

const folderName = 'comparedHtml';
const readBasicPath = './pageTexts/';
const writeBasicPath = './comparedHtml/';
const pathConfig = require('./config/pathList.json');
const tplHtml = fs.readFileSync('./config/template.html', 'utf-8');

let fileCount = 0;

function deleteDir(url) {
    var files = [];
    if (fs.existsSync(url)) { //判断给定的路径是否存在
        files = fs.readdirSync(url); //返回文件和子目录的数组
        files.forEach(function (file) {
            var curPath = path.join(url, file);
            if (fs.statSync(curPath).isDirectory()) { //同步读取文件夹文件，如果是文件夹，则函数回调
                deleteDir(curPath);
            } else {
                fs.unlinkSync(curPath); //是指定文件，则删除
            }
        });
        fs.rmdirSync(url); //清除文件夹
    } else {
        console.log('给定的路径不存在！');
    }

}
deleteDir(folderName);

//检查文件夹
if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
}


function basicRegExp(str) {
    return new RegExp(`<%${str}>`, 'igm');
}
function replaceTitle(text, title) {
    const regExp = basicRegExp('tpl-title');
    return text.replace(regExp, title);
}
function relpaceUrl(text, qaUrl, qabUrl) {
    let editText = text;
    const qaregExp = basicRegExp('url-qa');
    editText = editText.replace(qaregExp, qaUrl);
    const qabregExp = basicRegExp('url-qab');
    editText = editText.replace(qabregExp, qabUrl);
    return editText;
}
function replaceQa(text, title) {
    const regExp = basicRegExp('text-qa');
    return text.replace(regExp, title);
}
function replaceQab(text, title) {
    const regExp = basicRegExp('text-qab');
    return text.replace(regExp, title);
}
function relpaceMax(text, max) {
    return text.replace('\'<%max-index>\'', max);
}


function generatelHtml(html, featureName, comparedTexts) {
    const diffDoms = [];
    let diffCount = 0;
    let htmlStr = replaceTitle(html, featureName);
    let qaText = '';
    let qabText = '';
    const splitIcon = '<span class="compare-control compared-icon--split"></span>';

    lodash.forEach(comparedTexts, result => {
        /**
         * //update qaText
         * type:
         *      -1: qa独有（需要加标示）
         *      0: 相同
         *      1: qab独有 （忽律）
         */
        const [type, content] = result;
        switch (type) {
            case -1:
                qaText += `<span class="compared-qa">${content}</span>${splitIcon}`;
                break;
            case 1:
                qaText += `<span class="compared-qa--none compare-control">${content}</span>${splitIcon}`;
                break;
            case 0:
                qaText += content + splitIcon;
                break;
        }
    });

    lodash.forEach(comparedTexts, result => {
        /**
         * //update qabText
         * type:
         *      -1: qa独有（忽律）
         *      0: 相同
         *      1: qab独有 （需要加标示）
         */
        const [type, content] = result;
        switch (type) {
            case -1:
                diffCount++;
                qabText += `<span class="compared-qab--remove goto-${diffCount}">${content}</span>${splitIcon}`;
                diffDoms.push(qabText);
                break;
            case 1:
                diffCount++;
                qabText += `<span class="compared-qab goto-${diffCount}">${content}</span>${splitIcon}`;
                diffDoms.push(qabText);
                break;
            case 0:
                qabText += content + splitIcon;
                break;
        }
    });

    htmlStr = replaceQa(htmlStr, qaText);
    htmlStr = replaceQab(htmlStr, qabText);


    return {
        htmlStr,
        diffCount
    };
}


for (const fileName in pathConfig) {
    fileCount++;
    let basicHtml = tplHtml;
    const readTextPath = `${readBasicPath}${fileName}.json`;
    let writePath = `${writeBasicPath}${fileCount}_${fileName}.html`;
    const { featureName, qaText, qabText, url } = require(readTextPath);
    //对比顺序不能乱：01
    const comparedTexts = fastDiff(
        qaText,
        qabText
    );
    const result = generatelHtml(basicHtml, featureName, comparedTexts);
    let finalHtml = result.htmlStr;
    const diffCount = result.diffCount;


    finalHtml = relpaceUrl(finalHtml, url.qa, url.qab);
    finalHtml = relpaceMax(finalHtml, diffCount);

    if (diffCount) {
        writePath = writePath.replace('.html', `__Diff-${diffCount}.html`);
    }
    try {
        // fs.writeFileSync(writePath, JSON.stringify(comparedTexts), 'utf8');
        fs.writeFileSync(writePath, finalHtml, 'utf8');
        console.log(`${writePath}: Html has been updated~~~~`);
    } catch (err) {
        console.error(`${writePath}: Write Error!`);
    }
}


/**
 * PS: 文本对比说明  https://github.com/jhchen/fast-diff
var diff = require('fast-diff');

var good = 'Good dog';
var bad = 'Bad dog';

var result = diff(good, bad);
// [[-1, "Goo"], [1, "Ba"], [0, "d dog"]]

// Respect suggested edit location (cursor position), added in v1.1
diff('aaa', 'aaaa', 1)
// [[0, "a"], [1, "a"], [0, "aa"]]

// For convenience
diff.INSERT === 1;
diff.EQUAL === 0;
diff.DELETE === -1;

 */
