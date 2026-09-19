/* eslint-disable */
import queue from 'async/queue';
const isEdge = String(navigator.appVersion).indexOf("Edge") >= 0;
const parallelCurrentNum = isEdge ? 1 : 20;

const q = queue(function(task, callback) {
  let {context, image, x1, y1, width, height, targetX, targetY, cvsWidth, cvsHeight} = task;
  try{
	  context.drawImage(image, x1, y1, width, height, targetX, targetY, cvsWidth, cvsHeight);
  }catch(err){
    console.error(err);
  }
  if(task.gapTime){
    setTimeout(callback, task.gapTime)
  }else{
    callback()
  }
}, parallelCurrentNum);

let queuePush = params => new Promise(function(resolve, reject) {
  q.push(params, function(err, result) {
	  err ? reject(err) : resolve(result);
  });
});


export default class ThumbModel {
  static fromJson(jsonData) {
    const model = new ThumbModel();
    model.id = jsonData.id;
    model.path = jsonData.path;
    model.bbox = jsonData.coordinates;
    model.oriWidth = jsonData.width;
    model.oriHeight = jsonData.height;

    // model.bbox = jsonData.coordinates;
    // model.oriWidth = jsonData.width;
    // model.oriHeight = jsonData.height;
    return model;
  }

  static async imageLoader(imageUrl) {
    return new Promise(function (resolve, reject) {
      let image = new Image();
      // image.setAttribute('crossOrigin', 'anonymous');
      image.onload = () => {
        resolve(image);
      };
      image.onerror = reject;
      image.src = imageUrl;
    });
  }

  static async drawImage(canvas, thumbModel, box, size) {
    let imageUrl = thumbModel.path;
    // if (window.createImageBitmap) {
    //   let fetchConf = {
    //     header: {
    //       'Access-Control-Allow-Origin': '*'
    //     }
    //   };

    //   let response = await fetch(imageUrl, fetchConf);
    //   let imageBlob = await response.blob();
    //   let x1 = thumbModel.oriWidth * box[0];
    //   let y1 = thumbModel.oriHeight * box[1];
    //   let width = thumbModel.oriWidth * (box[2] - box[0]);
    //   let height = thumbModel.oriHeight * (box[3] - box[1]);
    //   // 解决小图不清晰问题
    //   let cvsWidth = width;
    //   let cvsHeight = height;
    //   if (size && size.width && size.height && !size.origin) {
    //     let devicePixelRatio = window.devicePixelRatio || 1
    //     let redio = Math.max(width / (size.width * devicePixelRatio), height / (size.height * devicePixelRatio))
    //     cvsWidth = width / redio
    //     cvsHeight = height / redio
    //   }
    //   canvas.width = cvsWidth;
    //   canvas.height = cvsHeight;

    //   let image = await createImageBitmap(imageBlob, x1, y1, width, height, {
    //     resizeWidth: width,
    //     resizeHeight: height
    //   });
    //   const context = canvas.getContext('bitmaprenderer');
    //   context.transferFromImageBitmap(image);
    //   return {canvas, width, height};
    // } else {
    let image = await this.imageLoader(imageUrl);
    let x1 = thumbModel.oriWidth * box[0];
    let y1 = thumbModel.oriHeight * box[1];
    let width = thumbModel.oriWidth * (box[2] - box[0]);
    let height = thumbModel.oriHeight * (box[3] - box[1]);
    const context = canvas.getContext('2d');
    // 解决小图不清晰问题
    let cvsWidth = width;
    let cvsHeight = height;
    if (size && size.width && size.height && !size.origin) {
      let devicePixelRatio = window.devicePixelRatio || 1;
      let redio = Math.max(width / (size.width * devicePixelRatio), height / (size.height * devicePixelRatio));
      cvsWidth = toInt(width / redio);
      cvsHeight = toInt(height / redio);
    }
    canvas.width = cvsWidth;
    canvas.height = cvsHeight;

    const targetX = 0;
    const targetY = 0;

    await queuePush({gapTime: 20, context, image, x1, y1, width, height, targetX, targetY, cvsWidth, cvsHeight});

    return {canvas, width, height};
    // }
  }
  // static getImageSrc(path) {
  //   return path;
  // }
  // get ImageSrc () {
  //   return `http://127.0.0.1:8080${this.path}`;
  //   // return this.path;
  // }

  get BackgroundImage() {
    return `url(${this.ImageSrc})`;
  }
}

function sleep(msTime) {
  return new Promise(resolve => {
    setTimeout(resolve, msTime);
  });
}

function toInt(n) {
	return 2* Math.round(n/2)
}
