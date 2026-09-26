// 渲染顺序调度器

// scheduler.js
class RenderScheduler {
  constructor(instanceName = 'RenderScheduler') {
    this.instanceName = instanceName
    this.waitQueue = []
    this.isRunning = false
    this.taskIntervalMs = 200
  }

  register(task) {
    const newTask = {
      id: crypto.randomUUID(),
      registeredAt: formatDateTime(new Date()),
      priority: task.priority,
      run: task.run,
    }

    if (newTask.priority === 0) {
      newTask.run()
      // 间隔任务
      this.waitQueue.unshift({
        id: crypto.randomUUID(),
        registeredAt: formatDateTime(new Date()),
        priority: 1,
        run: () => {},
      })
      return newTask.id
    }

    this.waitQueue.push(newTask)
    this.waitQueue.sort((a, b) => a.priority - b.priority)

    if (!this.isRunning) {
      this.isRunning = true
      // ✅ 改为微任务启动，不阻塞当前同步栈，至少等待一次事件循环
      Promise.resolve().then(() => {
        this.runLoop()
      })
    }
    return newTask.id
  }

  removeTask(taskId) {
    this.waitQueue = this.waitQueue.filter((t) => t.id !== taskId)
  }

  async runLoop() {
    if (this.waitQueue.length === 0) {
      this.isRunning = false
      return
    }
    const task = this.waitQueue.shift()
    task.run()

    /**
     * 下一帧的渲染
     **/

    setTimeout(() => {
      this.runLoop()
    }, this.taskIntervalMs)

    // // 2️⃣ ⭐ 等待 Vue 完成 DOM 更新
    // await nextTick();
    // // 3️⃣ ⭐ 等待浏览器完成绘制（一帧）
    // await new Promise(resolve => {
    //   requestAnimationFrame(resolve);
    // });
    // // 4️⃣ 继续下一个任务（现在间隔只有 ~16ms，而不是 500ms）
    // this.runLoop();
  }

  clear() {
    this.waitQueue = []
    this.isRunning = false
  }
}

export const scheduler = new RenderScheduler('global‑scheduler')

function formatDateTime(date) {
  void date
  return performance.now()
}
