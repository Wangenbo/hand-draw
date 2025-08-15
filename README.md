# 手势轨迹绘制应用

一个基于 MediaPipe 和 Web 技术的实时手势识别绘画应用，支持通过摄像头捕捉手势并绘制彩虹色轨迹。

## ✨ 功能特点

- 🎨 **彩虹轨迹绘制**：绘制的轨迹呈现流畅的彩虹渐变效果
- 👆 **精准手势识别**：只有标准的"食指指向"手势才会触发绘制
- 🎯 **稳定性检测**：连续3帧检测到正确手势才开始绘制，避免误触发
- 📷 **实时摄像头**：支持摄像头实时预览，镜像显示更自然
- 🔧 **调试模式**：提供详细的手势检测状态和调试信息
- 📸 **截图功能**：可以保存绘制的作品

## 🚀 快速开始

### 环境要求

- Node.js 14+
- 现代浏览器（支持 WebRTC 和 Canvas API）
- 摄像头设备

### 安装和运行

1. 克隆项目
```bash
git clone <repository-url>
cd hand-draw
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 打开浏览器访问 `http://localhost:5173`

## 🎮 使用方法

### 基本操作

1. **开始检测**：点击"开始检测"按钮启动摄像头和手势识别
2. **绘制轨迹**：
   - 伸出食指，其他手指弯曲
   - 保持手势稳定3帧以上
   - 移动食指指尖进行绘制
3. **清除画布**：点击"清除画布"按钮
4. **拍照保存**：点击"拍照"按钮保存当前画面
5. **测试模式**：点击"测试模式"显示手部关键点

### 手势要求

- ✅ **正确手势**：食指伸直，其他手指弯曲
- ❌ **错误手势**：多个手指伸直、握拳、手掌张开等

## 🛠️ 技术架构

### 核心技术

- **前端框架**：Vanilla JavaScript + Vite
- **手势识别**：Google MediaPipe Hands
- **图像处理**：HTML5 Canvas API
- **摄像头访问**：WebRTC getUserMedia API

### 项目结构

```
hand-draw/
├── index.html          # 主页面
├── src/
│   ├── main.js         # 主要逻辑
│   └── style.css       # 样式文件
├── package.json        # 项目配置
└── README.md          # 说明文档
```

### 关键算法

#### 手势检测算法

```javascript
// 检测食指伸直且其他手指弯曲
const indexExtended = indexTip.y < indexMcp.y - 0.02
const middleBent = middleTip.y > middleMcp.y - 0.01
const ringBent = ringTip.y > ringMcp.y - 0.01
const pinkyBent = pinkyTip.y > pinkyMcp.y - 0.01

// 稳定性检测
if (gestureScore > 0.5) {
  this.gestureStableFrames++
} else {
  this.gestureStableFrames = 0
}
```

#### 彩虹颜色生成

```javascript
getRainbowColor() {
  this.hue = (this.hue + 2) % 360
  return `hsl(${this.hue}, 100%, 50%)`
}
```

## 🎨 界面说明

### 主要元素

- **视频预览区**：显示摄像头画面（镜像模式）
- **绘制画布**：覆盖在视频上的透明画布
- **控制按钮**：开始/停止、清除、拍照等功能
- **状态显示**：手势状态、检测信息、调试数据

### 状态指示

- 🟢 **绿色**：检测到正确手势，可以绘制
- 🔵 **蓝色**：请伸出食指
- ⚪ **灰色**：未检测到手部

## 🔧 配置选项

### MediaPipe 参数

```javascript
this.hands.setOptions({
  maxNumHands: 1,              // 最大检测手数
  modelComplexity: 1,          // 模型复杂度
  minDetectionConfidence: 0.3, // 检测置信度
  minTrackingConfidence: 0.3   // 跟踪置信度
})
```

### 绘制参数

```javascript
this.drawCtx.lineWidth = 4           // 线条宽度
this.drawCtx.lineCap = 'round'       // 线条端点样式
this.drawCtx.lineJoin = 'round'      // 线条连接样式
this.requiredStableFrames = 3        // 稳定帧数要求
```

## 🐛 故障排除

### 常见问题

1. **摄像头无法启动**
   - 检查浏览器权限设置
   - 确保摄像头未被其他应用占用
   - 使用 HTTPS 协议访问

2. **手势检测不准确**
   - 确保光线充足
   - 保持手部在摄像头视野内
   - 避免背景干扰

3. **绘制不流畅**
   - 检查网络连接
   - 降低浏览器其他标签页负载
   - 确保设备性能足够

### 调试功能

- 点击"检查库状态"按钮查看 MediaPipe 库加载状态
- 开启"测试模式"查看手部关键点检测
- 查看浏览器控制台的详细日志

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系

如有问题或建议，请通过 Issue 联系。