export default class DrawIamge {
  // 随机生成RGBA颜色
  randomRgbaColor (min, max) {
    let r = min + Math.round(Math.random() * 1000) % (max - min) // 随机生成256以内r值
    let g = min + Math.round(Math.random() * 1000) % (max - min) // 随机生成256以内g值
    let b = min + Math.round(Math.random() * 1000) % (max - min) // 随机生成256以内b值
    return `rgb(${r},${g},${b})` // 返回rgba(r,g,b,a)格式颜色
  }
  convertImageToCanvas (w, h, text) {
    let canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    let context = canvas.getContext('2d') // 获取对应的2D对象(画笔)
    context.fillStyle = this.randomRgbaColor(210, 256) // 设置填充的背景颜色
    context.fillRect(0, 0, w, h) // 绘制 w*h 像素的已填充矩形：
    context.fillStyle = '#fff'
    context.textAlign = 'center'
    context.font = "bold 18px'字体','字体','宋体'" // 设置字体
    context.textBaseline = 'hanging' // 在绘制文本时使用的当前文本基线
    context.fillText(text, w / 2, (h / 2) - 9) // 设置文本内容
    return canvas.toDataURL('image/png')
  }
  // 将base64转换成file对象
  dataURLtoFile (dataurl, filename = 'file') {
    let arr = dataurl.split(',')
    let mime = arr[0].match(/:(.*?);/)[1]
    let suffix = mime.split('/')[1]
    let bstr = atob(arr[1])
    let n = bstr.length
    let u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], `${filename}.${suffix}`, {type: mime})
  }
}



// 创建文件下载
function download(downfile) {
  const tmpLink = document.createElement("a");
  const objectUrl = URL.createObjectURL(downfile);

  tmpLink.href = objectUrl;
  tmpLink.download = downfile.name;
  document.body.appendChild(tmpLink);
  tmpLink.click();

  document.body.removeChild(tmpLink);
  URL.revokeObjectURL(objectUrl);
}
download(file);


// 接口形式下载
apiClient
    .get(apiFileUrl, {
        responseType: "arraybuffer",
    })
    .then((response) => {
        const { headers, data } = response;
        const fileinfo = {
            blobData: data,
            fileName: ((strDispostion) => {
                if (strDispostion) {
                    if (
                        strDispostion !== "" &&
                        strDispostion.split("filename=").length > 1
                    ) {
                        return decodeURIComponent(
                            strDispostion.split("filename=")[1]
                        );
                    } else {
                        return "tempname";
                    }
                }
            })(headers["content-disposition"]),
        };

        const tmpLink = document.createElement("a");
        const { blobData, fileName } = fileinfo;
        const blob = new Blob([blobData], {
            type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const objectUrl = URL.createObjectURL(blob);
        tmpLink.href = objectUrl;
        tmpLink.download = fileName;

        document.body.appendChild(tmpLink); // 如果不需要显示下载链接可以不需要这行代码
        tmpLink.click();
        URL.revokeObjectURL(objectUrl);
    });
