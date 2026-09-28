// 渲染顺序调度器

// scheduler.js
class RenderScheduler {
  constructor(instanceName = 'RenderScheduler') {
    this.instanceName = instanceName
    this.waitQueue = []
    this.isRunning = false
    this.taskIntervalMs = 400
  }

  register(task) {
    const newTask = {
      id: crypto.randomUUID(),
      registeredAt: formatDateTime(new Date()),
      priority: task.priority,
      run: task.run,
    }

    if (newTask.priority === 0) {
      // 0 表示同步放行；随后插入占位任务，仍为后续队列保留一次可观察的调度间隔。
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
    // 依赖现代引擎稳定排序，使相同优先级任务保持注册顺序。
    this.waitQueue.sort((a, b) => a.priority - b.priority)

    if (!this.isRunning) {
      this.isRunning = true
      // 微任务启动可让同一同步调用栈中的任务先全部入队，再统一按优先级排序执行。
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

    // 200ms 是演示用的可感知间隔，用来展示渐进渲染顺序，而不是通用调度策略。
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
    // clear 只清空尚未执行的任务；已进入回调的任务不能被撤销。
    this.waitQueue = []
    this.isRunning = false
  }
}

export const scheduler = new RenderScheduler('global‑scheduler')

function formatDateTime(date) {
  void date
  return performance.now()
}
