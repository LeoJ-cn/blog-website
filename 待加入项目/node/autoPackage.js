const AdmZip = require("adm-zip");

async function creatZip(foldName) {
  try {
    const zip = new AdmZip();
    console.info("【创建包】开始创建..." + foldName);
    const entryPath = `./${foldName}`;
    const outPath = `./zips-nodemodules/${foldName}.zip`;
    await zip.addLocalFolder(entryPath, "", (hotZipName) => {
      // 过滤node_module
      if (hotZipName.indexOf("node_modules") > -1) {
        return false;
      }
      return true;
    });
    // 输出路径
    await zip.writeZip(outPath, function (err, msg) {
      console.info("【创建压缩包】状态:" + foldName + ' ', err || "成功", msg);
    });
    console.info("【创建压缩包】压缩结束." + foldName);
  } catch (e) {
    const errorMsg = "【创建压缩包】发生未知错误！！！" + foldName;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

async function addzip() {
  const startTime = new Date().getTime()

  try {
    await creatZip("erp");
  } catch (error) {}
  try {
    await creatZip("erp-bug");
  } catch (error) {}
  try {
    await creatZip("weimob");
  } catch (error) {}


  const endTime = new Date().getTime()
  const rangeT = (endTime - startTime)/1000
  console.log(`压缩时间： ${rangeT}s`)
}

addzip();
