import './style.css'

class HandDrawApp {
  constructor() {
    console.log('HandDrawApp 构造函数开始执行')
    this.initHTML()
    this.initElements()
    this.initCanvas()
    this.initEventListeners()
    this.loadHandsModel()
    
    // 状态变量
    this.stream = null
    this.hands = null
    this.camera = null
    this.testMode = false
    
    // 双手绘制状态
    this.handStates = {
      left: {
        isDrawing: false,
        lastPoint: null,
        gestureStableFrames: 0,
        gestureConfirmed: false,
        invalidFrames: 0,
        hue: 0
      },
      right: {
        isDrawing: false,
        lastPoint: null,
        gestureStableFrames: 0,
        gestureConfirmed: false,
        invalidFrames: 0,
        hue: 180 // 右手从不同色相开始
      }
    }
    this.requiredStableFrames = 3
    
    console.log('HandDrawApp 初始化完成')
  }

  initHTML() {
    const app = document.querySelector('#app')
    app.innerHTML = `
      <div class="camera-app">
        <h1>手势绘画应用</h1>
        <div class="video-container">
          <video id="video" autoplay muted></video>
          <canvas id="drawCanvas"></canvas>
        </div>
        <div class="controls">
          <button id="startBtn" onclick="console.log('按钮被直接点击')">开启摄像头</button>
          <button id="captureBtn" disabled>保存画作</button>
          <button id="clearBtn" disabled>清除轨迹</button>
          <button id="testBtn" disabled>测试模式</button>
          <button id="checkLibBtn">检查库状态</button>
        </div>
        <div id="status">点击"开启摄像头"开始</div>
        <div id="gesture-indicator" style="margin-top: 10px; padding: 10px; border-radius: 5px; font-size: 14px; font-weight: bold; text-align: center; background: #ddd; color: #666;">手势状态：未检测</div>
        <div id="debug-info" style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px; font-family: monospace; font-size: 12px;">调试信息</div>
        <div id="photos"></div>
      </div>
    `
  }

  initElements() {
    this.video = document.getElementById('video')
    this.drawCanvas = document.getElementById('drawCanvas')
    this.drawCtx = this.drawCanvas.getContext('2d')
    this.startBtn = document.getElementById('startBtn')
    this.captureBtn = document.getElementById('captureBtn')
    this.clearBtn = document.getElementById('clearBtn')
    this.testBtn = document.getElementById('testBtn')
    this.checkLibBtn = document.getElementById('checkLibBtn')
    this.statusEl = document.getElementById('status')
    this.gestureIndicator = document.getElementById('gesture-indicator')
    this.debugEl = document.getElementById('debug-info')
    this.photosContainer = document.getElementById('photos')
    
    // 调试：检查元素是否正确获取
    console.log('Elements check:', {
      startBtn: this.startBtn,
      video: this.video,
      canvas: this.drawCanvas,
      status: this.statusEl
    })
    
    if (!this.startBtn) {
      console.error('开启摄像头按钮未找到！')
    }
  }

  initCanvas() {
    // 设置canvas的实际分辨率
    this.drawCanvas.width = 640
    this.drawCanvas.height = 480
    
    // 确保canvas的显示尺寸与video元素完全一致
    this.updateCanvasSize()
    
    this.drawCtx.lineWidth = 4
    this.drawCtx.lineCap = 'round'
    this.drawCtx.lineJoin = 'round'
  }
  
  updateCanvasSize() {
    // 获取video元素的实际显示尺寸
    const videoRect = this.video.getBoundingClientRect()
    const videoComputedStyle = window.getComputedStyle(this.video)
    
    // 设置canvas的显示尺寸与video完全一致
    this.drawCanvas.style.width = videoComputedStyle.width
    this.drawCanvas.style.height = videoComputedStyle.height
    
    console.log('Canvas尺寸已更新:', {
      canvasWidth: this.drawCanvas.style.width,
      canvasHeight: this.drawCanvas.style.height,
      videoWidth: videoComputedStyle.width,
      videoHeight: videoComputedStyle.height
    })
  }
  
  // 获取彩虹颜色
  getRainbowColor(handType) {
    const handState = this.handStates[handType]
    handState.hue = (handState.hue + 2) % 360
    return `hsl(${handState.hue}, 100%, 50%)`
  }
  
  // 判断手的类型（左手或右手）
  getHandType(landmarks) {
    // 通过拇指和小指的相对位置判断左右手
    const thumbTip = landmarks[4]
    const pinkyTip = landmarks[20]
    return thumbTip.x < pinkyTip.x ? 'right' : 'left'
  }

  initEventListeners() {
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        console.log('开启摄像头按钮被点击')
        this.toggleCamera()
      })
      console.log('开启摄像头按钮事件监听器已绑定')
    } else {
      console.error('无法绑定开启摄像头按钮事件：按钮元素不存在')
    }
    
    if (this.captureBtn) {
      this.captureBtn.addEventListener('click', () => this.takePhoto())
    }
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clearCanvas())
    }
    if (this.testBtn) {
      this.testBtn.addEventListener('click', () => this.toggleTestMode())
    }
    if (this.checkLibBtn) {
      this.checkLibBtn.addEventListener('click', () => this.checkLibraryStatus())
    }
    
    // 监听窗口大小变化，确保canvas与video尺寸同步
    window.addEventListener('resize', () => {
      if (this.video && this.drawCanvas) {
        setTimeout(() => {
          this.updateCanvasSize()
        }, 100)
      }
    })
  }

  async loadHandsModel() {
    try {
      console.log('检查MediaPipe库:', {
        Hands: typeof Hands,
        Camera: typeof Camera,
        drawingUtils: typeof drawingUtils
      })
      
      if (typeof Hands === 'undefined') {
        this.debugEl.textContent = 'MediaPipe Hands 库未加载'
        console.error('Hands类未定义，请检查MediaPipe库是否正确加载')
        return false
      }
      
      console.log('开始创建Hands实例...')
      this.hands = new Hands({
        locateFile: (file) => {
          console.log('加载文件:', file)
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
        }
      })
      
      console.log('Hands实例创建成功，设置参数...')
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      })
      
      this.hands.onResults(results => {
        console.log('手势检测结果:', results)
        this.onHandsResults(results)
      })
      
      console.log('MediaPipe Hands 模型配置完成')
      this.debugEl.textContent = 'MediaPipe Hands 模型加载成功'
      return true
    } catch (error) {
      console.error('加载 MediaPipe Hands 模型失败:', error)
      this.debugEl.textContent = `模型加载失败: ${error.message}`
      this.hands = null
      return false
    }
  }

  async toggleCamera() {
    if (this.stream) {
      this.stopCamera()
    } else {
      await this.startCamera()
    }
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      })
      
      this.video.srcObject = this.stream
      
      this.video.onloadedmetadata = () => {
        this.video.play()
        // 设置canvas的实际分辨率为video的原始尺寸
        this.drawCanvas.width = this.video.videoWidth
        this.drawCanvas.height = this.video.videoHeight
        // 立即更新canvas的显示尺寸与video元素一致
        this.updateCanvasSize()
      }
      
      // 监听video的loadeddata事件，确保视频数据加载完成后立即同步
      this.video.onloadeddata = () => {
        this.updateCanvasSize()
      }
      
      // 监听video的canplay事件，确保视频可以播放时立即同步
      this.video.oncanplay = () => {
        this.updateCanvasSize()
      }
      
      // 启用canvas的pointer events用于绘制
      this.drawCanvas.style.pointerEvents = 'auto'
      
      this.startBtn.textContent = '关闭摄像头'
      this.captureBtn.disabled = false
      this.clearBtn.disabled = false
      this.testBtn.disabled = false
      
      // 先加载MediaPipe模型，然后启动手势检测
      this.debugEl.textContent = '正在加载MediaPipe模型...'
      const modelLoaded = await this.loadHandsModel()
      
      if (modelLoaded) {
        this.startHandDetection()
        this.statusEl.textContent = '摄像头已开启，请伸出食指开始绘制'
      } else {
        this.statusEl.textContent = '摄像头已开启，但手势检测不可用'
        this.debugEl.textContent = 'MediaPipe模型加载失败'
      }
    } catch (error) {
      console.error('启动摄像头失败:', error)
      this.statusEl.textContent = '摄像头启动失败: ' + error.message
      this.debugEl.textContent = `摄像头错误: ${error.message}`
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    if (this.camera) {
      this.camera.stop()
      this.camera = null
    }
    
    // 禁用canvas的pointer events
    this.drawCanvas.style.pointerEvents = 'none'
    
    this.video.srcObject = null
    this.startBtn.textContent = '开启摄像头'
    this.captureBtn.disabled = true
    this.clearBtn.disabled = true
    this.testBtn.disabled = true
    this.statusEl.textContent = '摄像头已关闭'
    this.debugEl.textContent = '摄像头已停止'
  }

  clearCanvas() {
    this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height)
    this.isDrawing = false
    this.lastPoint = null
    this.statusEl.textContent = '轨迹已清除'
  }

  toggleTestMode() {
    this.testMode = !this.testMode
    this.testBtn.textContent = this.testMode ? '关闭测试' : '测试模式'
    this.statusEl.textContent = this.testMode ? '测试模式已开启' : '测试模式已关闭'
  }
  
  checkLibraryStatus() {
    const status = {
      Hands: typeof Hands !== 'undefined',
      Camera: typeof Camera !== 'undefined',
      drawingUtils: typeof drawingUtils !== 'undefined',
      handsInstance: !!this.hands,
      cameraInstance: !!this.camera
    }
    
    console.log('MediaPipe库状态:', status)
    
    let message = 'MediaPipe库状态:\n'
    message += `Hands: ${status.Hands ? '✓' : '✗'}\n`
    message += `Camera: ${status.Camera ? '✓' : '✗'}\n`
    message += `DrawingUtils: ${status.drawingUtils ? '✓' : '✗'}\n`
    message += `Hands实例: ${status.handsInstance ? '✓' : '✗'}\n`
    message += `Camera实例: ${status.cameraInstance ? '✓' : '✗'}`
    
    this.debugEl.textContent = message
    alert(message)
  }

  drawHandLandmarks(landmarks) {
    // 清除之前的关键点
    this.drawCtx.save()
    
    // 绘制关键点
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * this.drawCanvas.width
      const y = landmark.y * this.drawCanvas.height
      
      this.drawCtx.beginPath()
      this.drawCtx.arc(x, y, 3, 0, 2 * Math.PI)
      
      // 食指指尖用红色标记
      if (index === 8) {
        this.drawCtx.fillStyle = 'red'
      } else {
        this.drawCtx.fillStyle = 'blue'
      }
      
      this.drawCtx.fill()
      
      // 显示关键点编号
      this.drawCtx.fillStyle = 'white'
      this.drawCtx.font = '10px Arial'
      this.drawCtx.textAlign = 'center'
      this.drawCtx.fillText(index.toString(), x, y + 3)
    })
    
    this.drawCtx.restore()
  }

  startHandDetection() {
    console.log('开始启动手势检测...')
    console.log('检查状态:', {
      hands: !!this.hands,
      Camera: typeof Camera !== 'undefined',
      video: !!this.video
    })
    
    if (this.hands && typeof Camera !== 'undefined') {
      try {
        let frameCount = 0
        this.camera = new Camera(this.video, {
          onFrame: async () => {
            frameCount++
            if (frameCount % 30 === 0) {
              console.log(`处理第 ${frameCount} 帧`)
            }
            if (this.hands) {
              try {
                await this.hands.send({ image: this.video })
              } catch (error) {
                console.error('手势检测错误:', error)
                this.debugEl.textContent = `检测错误: ${error.message}`
              }
            }
          },
          width: 640,
          height: 480
        })
        
        console.log('Camera 实例创建成功，开始启动...')
        this.camera.start()
        console.log('Camera 启动完成')
        this.debugEl.textContent = '手势检测已启动 - 等待检测结果...'
      } catch (error) {
        console.error('启动 Camera 失败:', error)
        this.debugEl.textContent = `Camera 启动失败: ${error.message}`
      }
    } else {
      const missing = []
      if (!this.hands) missing.push('Hands实例')
      if (typeof Camera === 'undefined') missing.push('Camera类')
      const message = `MediaPipe 组件不可用: ${missing.join(', ')}`
      console.error(message)
      this.debugEl.textContent = message
    }
  }

  onHandsResults(results) {
    console.log('收到手势检测结果:', {
      hasLandmarks: !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0),
      landmarksCount: results.multiHandLandmarks ? results.multiHandLandmarks.length : 0,
      timestamp: Date.now()
    })
    
    // 重置所有手的绘制状态
    let anyHandDrawing = false
    let statusMessages = []
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // 处理每只检测到的手
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const handType = this.getHandType(landmarks)
        const handState = this.handStates[handType]
        
        // 获取关键点
        const indexTip = landmarks[8]     // 食指指尖
        const indexMcp = landmarks[5]     // 食指根部
        const middleTip = landmarks[12]
        const middleMcp = landmarks[9]
        const ringTip = landmarks[16]
        const ringMcp = landmarks[13]
        const pinkyTip = landmarks[20]
        const pinkyMcp = landmarks[17]
        
        // 严格的手势检测逻辑 - 确保食指明确伸出后才绘画
        const indexExtended = indexTip.y < indexMcp.y - 0.02  // 食指必须明确伸直
        const middleBent = middleTip.y > middleMcp.y + 0.01   // 中指必须弯曲
        const ringBent = ringTip.y > ringMcp.y + 0.01        // 无名指必须弯曲
        const pinkyBent = pinkyTip.y > pinkyMcp.y + 0.01     // 小指必须弯曲
        
        // 严格的手势判断：食指伸直且至少两个其他手指弯曲
        const bentFingers = [middleBent, ringBent, pinkyBent].filter(bent => bent).length
        const isValidGesture = indexExtended && bentFingers >= 2
        
        // 添加手势确认阶段
        if (!handState.gestureConfirmed) {
          // 第一阶段：确认食指伸出
          if (isValidGesture) {
            handState.gestureStableFrames++
            if (handState.gestureStableFrames >= this.requiredStableFrames) {
              handState.gestureConfirmed = true
              handState.gestureStableFrames = 0
            }
          } else {
            handState.gestureStableFrames = 0
          }
        } else {
          // 第二阶段：确认手势后才能绘画
          if (isValidGesture) {
            handState.gestureStableFrames++
            // 重置失效计数器
            handState.invalidFrames = 0
          } else {
            // 增加容错机制：允许短暂的手势识别失败
            handState.invalidFrames = (handState.invalidFrames || 0) + 1
            
            // 只有连续多帧无效才重置确认状态
            if (handState.invalidFrames >= 5) {
              handState.gestureConfirmed = false
              handState.gestureStableFrames = 0
              handState.isDrawing = false
              handState.lastPoint = null
              handState.invalidFrames = 0
            }
          }
        }
        
        // 优化绘画连续性：手势确认后允许短暂的识别失败
        const shouldDraw = handState.gestureConfirmed && 
                          (isValidGesture || (handState.invalidFrames > 0 && handState.invalidFrames < 3)) && 
                          handState.gestureStableFrames >= 2
        
        // 测试模式：绘制手部关键点
        if (this.testMode) {
          this.drawHandLandmarks(landmarks)
        }
        
        if (shouldDraw) {
          const x = indexTip.x * this.drawCanvas.width
          const y = indexTip.y * this.drawCanvas.height
          
          if (handState.isDrawing && handState.lastPoint) {
            // 计算距离，避免跳跃
            const distance = Math.sqrt(
              Math.pow(x - handState.lastPoint.x, 2) + 
              Math.pow(y - handState.lastPoint.y, 2)
            )
            
            if (distance > 1) {  // 只要有移动就绘制
              this.drawCtx.strokeStyle = this.getRainbowColor(handType)
              this.drawCtx.beginPath()
              this.drawCtx.moveTo(handState.lastPoint.x, handState.lastPoint.y)
              
              if (distance <= 150) {
                // 正常距离，直接连线
                this.drawCtx.lineTo(x, y)
              } else if (distance <= 300) {
                // 距离较大时，使用插值绘制确保连续性
                const steps = Math.ceil(distance / 40)  // 每40像素一个插值点，更密集的插值
                for (let i = 1; i <= steps; i++) {
                  const ratio = i / steps
                  const interpX = handState.lastPoint.x + (x - handState.lastPoint.x) * ratio
                  const interpY = handState.lastPoint.y + (y - handState.lastPoint.y) * ratio
                  this.drawCtx.lineTo(interpX, interpY)
                }
              } else {
                // 超大距离时，直接跳跃到新位置，避免绘画中断
                this.drawCtx.lineTo(x, y)
              }
              
              this.drawCtx.stroke()
            }
          }
          
          handState.isDrawing = true
          handState.lastPoint = { x, y }
          anyHandDrawing = true
          statusMessages.push(`${handType === 'left' ? '左手' : '右手'}正在绘制`)
        } else {
          handState.isDrawing = false
          handState.lastPoint = null
          if (handState.gestureConfirmed) {
            statusMessages.push(`${handType === 'left' ? '左手' : '右手'}已确认，等待绘制`)
          } else if (handState.gestureStableFrames > 0) {
            statusMessages.push(`${handType === 'left' ? '左手' : '右手'}确认中(${handState.gestureStableFrames}/${this.requiredStableFrames})`)
          } else {
            statusMessages.push(`${handType === 'left' ? '左手' : '右手'}待机`)
          }
        }
      })
      
      // 更新界面状态
      const activeHands = results.multiHandLandmarks.length
      this.debugEl.textContent = `检测到${activeHands}只手: ${statusMessages.join(', ')}`
      
      if (anyHandDrawing) {
        this.gestureIndicator.style.background = '#4CAF50'
        this.gestureIndicator.style.color = 'white'
        this.gestureIndicator.textContent = '手势状态：✓ 双手绘制模式'
        this.statusEl.textContent = statusMessages.join(' | ')
      } else {
        this.gestureIndicator.style.background = '#2196F3'
        this.gestureIndicator.style.color = 'white'
        this.gestureIndicator.textContent = '手势状态：👆 请伸出食指开始绘制'
        this.statusEl.textContent = '请伸出食指开始绘制'
      }
    } else {
      // 未检测到手部，重置所有状态
      Object.values(this.handStates).forEach(handState => {
        handState.isDrawing = false
        handState.lastPoint = null
        handState.gestureStableFrames = 0
        handState.gestureConfirmed = false
        handState.invalidFrames = 0
      })
      
      this.debugEl.textContent = '未检测到手部'
      this.gestureIndicator.style.background = '#ddd'
      this.gestureIndicator.style.color = '#666'
      this.gestureIndicator.textContent = '手势状态：未检测到手部'
      this.statusEl.textContent = '请将手放在摄像头前'
    }
  }

  takePhoto() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = this.drawCanvas.width
    canvas.height = this.drawCanvas.height
    
    // 绘制视频帧
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height)
    
    // 绘制轨迹
    ctx.drawImage(this.drawCanvas, 0, 0)
    
    // 转换为图片并显示
    const dataURL = canvas.toDataURL('image/png')
    const img = document.createElement('img')
    img.src = dataURL
    img.style.width = '200px'
    img.style.margin = '10px'
    img.style.border = '2px solid #ccc'
    
    this.photosContainer.appendChild(img)
    
    this.statusEl.textContent = '照片已保存'
  }
}

new HandDrawApp()
