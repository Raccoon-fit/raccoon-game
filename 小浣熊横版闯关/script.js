// 游戏主类
class RaccoonAdventure {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentScreen = 'levelSelect';
        this.currentLevel = 1;
        this.gameState = 'playing'; // playing, won
        this.keys = {};
        
        // 关卡进度管理
        this.maxUnlockedLevel = 1; // 最大解锁关卡
        this.initLevelProgress();
        
        // 设备检测
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 游戏手柄支持
        this.gamepad = {
            connected: false,
            index: null,
            lastState: {},
            mapping: {
                14: 'left',   // D-pad left
                15: 'right',  // D-pad right
                12: 'up',     // D-pad up
                13: 'down',   // D-pad down
                0: 'action',  // A button
                1: 'action2', // B button
                2: 'action3', // X button
                3: 'action4', // Y button
                5: 'jump',    // RB/R1
                4: 'jump',    // LB/L1
            }
        };
        
        this.init();
    }
    
    initLevelProgress() {
        console.log('🔧 初始化关卡进度...');
        // 从本地存储恢复进度
        const savedProgress = localStorage.getItem('raccoon_adventure_progress');
        if (savedProgress) {
            try {
                const progress = JSON.parse(savedProgress);
                this.maxUnlockedLevel = progress.maxUnlockedLevel || 1;
                this.levelStars = progress.levelStars || {}; // 扩展：保存每关星星数
                console.log('✅ 从localStorage恢复进度:', this.maxUnlockedLevel, '关已解锁');
                console.log('⭐ 恢复星星数据:', this.levelStars);
            } catch (e) {
                console.log('❌ 解析保存的进度失败:', e);
                this.maxUnlockedLevel = 1;
                this.levelStars = {};
            }
        } else {
            console.log('ℹ️ 无保存的进度，使用默认设置（仅第1关）');
            this.maxUnlockedLevel = 1;
            this.levelStars = {};
        }
        
        // 延迟更新UI，确保DOM已加载
        setTimeout(() => {
            this.updateLevelCards();
            console.log('🎯 关卡卡片状态已更新');
        }, 100);
    }
    
    saveProgress() {
        const progress = {
            maxUnlockedLevel: this.maxUnlockedLevel,
            levelStars: this.levelStars || {}, // 扩展：保存每关星星数
            timestamp: Date.now()
        };
        try {
            localStorage.setItem('raccoon_adventure_progress', JSON.stringify(progress));
            console.log('💾 进度已保存:', progress);
        } catch (e) {
            console.error('❌ 保存进度失败:', e);
        }
    }
    
    updateLevelCards() {
        console.log('🎯 更新关卡卡片状态... 当前最大解锁:', this.maxUnlockedLevel);
        
        // 调试信息：显示所有关卡的解锁状态
        for (let i = 1; i <= 6; i++) {
            console.log(`关卡 ${i}: ${i <= this.maxUnlockedLevel ? '已解锁' : '已锁定'} (maxUnlockedLevel=${this.maxUnlockedLevel})`);
        }
        
        // 更新所有关卡卡片的显示状态
        for (let i = 1; i <= 6; i++) {
            const levelCard = document.querySelector(`[data-level="${i}"]`);
            if (levelCard) {
                if (i <= this.maxUnlockedLevel) {
                    // 解锁状态
                    levelCard.classList.remove('locked');
                    const icon = levelCard.querySelector('.level-icon');
                    if (icon) {
                        if (i === 1) {
                            icon.textContent = '⭐';
                        } else {
                            icon.textContent = '🎯';
                        }
                    }
                    console.log(`✅ 关卡 ${i}: 已解锁`);
                } else {
                    // 锁定状态
                    levelCard.classList.add('locked');
                    const icon = levelCard.querySelector('.level-icon');
                    if (icon) {
                        icon.textContent = '🔒';
                    }
                    console.log(`🔒 关卡 ${i}: 已锁定`);
                }
                
                // 更新星星显示 - 新增功能
                this.updateLevelStarsDisplay(i);
            } else {
                console.warn(`⚠️ 找不到关卡 ${i} 的卡片元素`);
            }
        }
        console.log('🎯 关卡卡片状态更新完成');
    }
    
    // 新增方法：更新单个关卡的星星显示
    updateLevelStarsDisplay(levelNumber) {
        const levelCard = document.querySelector(`[data-level="${levelNumber}"]`);
        if (!levelCard) return;
        
        const stars = levelCard.querySelectorAll('.level-stars .star');
        const collectedStars = this.levelStars[levelNumber] || 0; // 从保存的进度获取星星数
        
        stars.forEach((star, index) => {
            if (index < collectedStars) {
                // 已收集的星星
                star.textContent = '★';
                star.style.color = '#FFD700'; // 金色
            } else {
                // 未收集的星星
                star.textContent = '☆';
                star.style.color = '#CCC'; // 灰色
            }
        });
        
        console.log(`⭐ 关卡 ${levelNumber} 星星显示已更新: ${collectedStars}/3`);
    }
    
    // 新增方法：更新关卡星星数量
    updateLevelStars() {
        let earnedStars = 0;
        
        // 根据当前关卡类型计算星星数量
        switch (this.currentLevel) {
            case 1:
                // 第1关：基础关卡 - 根据完成时间和操作次数评分
                if (this.startTime) {
                    const elapsed = (Date.now() - this.startTime) / 1000;
                    if (elapsed <= 30) earnedStars = 3;      // 30秒内完成，3星
                    else if (elapsed <= 60) earnedStars = 2; // 1分钟内完成，2星
                    else earnedStars = 1;                    // 超过1分钟，1星
                    console.log(`🏁 第1关完成时间: ${elapsed.toFixed(1)}秒，获得 ${earnedStars} 星`);
                } else {
                    earnedStars = 1; // 默认1星
                }
                break;
                
            case 2:
                // 第2关：移动平台挑战 - 根据成功使用平台次数评分
                if (this.movingPlatforms && this.movingPlatforms.length > 0) {
                    const platformUses = this.movingPlatforms.filter(p => p.used).length;
                    const totalPlatforms = this.movingPlatforms.length;
                    const usageRate = platformUses / totalPlatforms;
                    
                    if (usageRate >= 0.8) earnedStars = 3;      // 80%+平台使用，3星
                    else if (usageRate >= 0.5) earnedStars = 2; // 50%+平台使用，2星
                    else earnedStars = 1;                       // 低于50%使用，1星
                    
                    console.log(`🏗️ 第2关平台使用: ${platformUses}/${totalPlatforms} (${(usageRate*100).toFixed(0)}%)，获得 ${earnedStars} 星`);
                } else {
                    earnedStars = 1;
                }
                break;
                
            case 3:
                // 第3关：障碍挑战 - 根据碰撞次数和时间评分
                if (this.collisions !== undefined && this.startTime) {
                    const elapsed = (Date.now() - this.startTime) / 1000;
                    
                    if (this.collisions <= 2 && elapsed <= 45) {
                        earnedStars = 3;      // 少碰撞+快速完成，3星
                    } else if (this.collisions <= 5 && elapsed <= 90) {
                        earnedStars = 2;      // 中等碰撞+合理时间，2星
                    } else {
                        earnedStars = 1;      // 较多碰撞或较慢，1星
                    }
                    
                    console.log(`🚧 第3关统计: 碰撞${this.collisions}次，时间${elapsed.toFixed(1)}秒，获得 ${earnedStars} 星`);
                } else {
                    earnedStars = 1;
                }
                break;
                
            case 4:
                // 第4关：根据收集的星星数量计算
                if (this.stars && this.stars.length > 0) {
                    const collectedCount = this.stars.filter(star => star.collected).length;
                    earnedStars = Math.min(collectedCount, 3); // 最多3星
                } else {
                    earnedStars = 1; // 至少1星
                }
                break;
                
            case 5:
                // 第5关：时间挑战，根据剩余时间计算星星
                if (this.timeChallenge) {
                    // 计算剩余时间
                    const currentTime = Date.now();
                    const elapsedSeconds = (currentTime - this.timeChallenge.startTime) / 1000;
                    const timeLeft = Math.max(0, this.timeChallenge.timeLimit - elapsedSeconds);
                    
                    if (timeLeft >= 20) {
                        earnedStars = 3; // 20秒以上，3星
                    } else if (timeLeft >= 10) {
                        earnedStars = 2; // 10-20秒，2星
                    } else {
                        earnedStars = 1; // 10秒以下，1星
                    }
                    
                    console.log(`⏰ 第5关时间统计: 剩余 ${timeLeft.toFixed(1)}秒，获得 ${earnedStars} 星`);
                } else {
                    earnedStars = 1;
                }
                break;
                

            default:
                earnedStars = 1;
        }
        
        // 更新星星数据（只增加不减少）
        const previousStars = this.levelStars[this.currentLevel] || 0;
        this.levelStars[this.currentLevel] = Math.max(previousStars, earnedStars);
        
        console.log(`⭐ 关卡 ${this.currentLevel} 通关，获得 ${earnedStars} 星！总星星: ${this.levelStars[this.currentLevel]} / 3`);
        
        // 更新关卡卡片的星星显示
        this.updateLevelStarsDisplay(this.currentLevel);
        
        // 保存进度
        this.saveProgress();
    }
    
    init() {
        console.log('🎮 Initializing Raccoon Adventure Game...');
        
        try {
            this.setupCanvas();
            this.setupEventListeners();
            this.setupGamepadSupport();
            
            // 确保关卡进度已加载
            this.updateLevelCards();
            this.showScreen('levelSelect');
            
            if (this.isMobile) {
                this.setupMobileControls();
            }
            
            // 确保画布大小正确
            this.updateCanvasSize();
            
            console.log('✅ Game initialized successfully');
            console.log('📊 Max unlocked level:', this.maxUnlockedLevel);
        } catch (error) {
            console.error('❌ Error initializing game:', error);
        }
    }
    
    setupCanvas() {
        // 设置画布大小 - 使用固定尺寸避免缩放问题
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // 简单的响应式调整
        const updateCanvasSize = () => {
            const container = this.canvas.parentElement;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // 计算合适的显示尺寸
            const maxWidth = Math.min(containerWidth - 40, 800);
            const maxHeight = Math.min(containerHeight - 40, 600);
            
            // 保持宽高比
            const aspectRatio = 800 / 600;
            let displayWidth = maxWidth;
            let displayHeight = maxWidth / aspectRatio;
            
            if (displayHeight > maxHeight) {
                displayHeight = maxHeight;
                displayWidth = maxHeight * aspectRatio;
            }
            
            this.canvas.style.width = displayWidth + 'px';
            this.canvas.style.height = displayHeight + 'px';
            this.canvas.style.maxWidth = '100%';
            this.canvas.style.maxHeight = '100%';
        };
        
        window.addEventListener('resize', () => this.updateCanvasSize());
        // 延迟执行，确保DOM完全加载
        setTimeout(() => this.updateCanvasSize(), 100);
    }
    
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 计算合适的显示尺寸
        const maxWidth = Math.min(containerWidth - 40, 800);
        const maxHeight = Math.min(containerHeight - 40, 600);
        
        // 保持宽高比
        const aspectRatio = 800 / 600;
        let displayWidth = maxWidth;
        let displayHeight = maxWidth / aspectRatio;
        
        if (displayHeight > maxHeight) {
            displayHeight = maxHeight;
            displayWidth = displayHeight * aspectRatio;
        }
        
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
    }
    
    setupEventListeners() {
        // 关卡卡片点击
        console.log('🎯 设置关卡卡片点击事件...');
        const levelCards = document.querySelectorAll('.level-card');
        levelCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const level = e.currentTarget.dataset.level;
                const isLocked = e.currentTarget.classList.contains('locked');
                
                console.log(`🎮 用户点击关卡 ${level}, 锁定状态: ${isLocked}, 当前最大解锁: ${this.maxUnlockedLevel}`);
                

                
                if (isLocked) {
                    console.log('🚫 尝试点击已锁定的关卡');
                    alert(`此关卡尚未解锁！当前最大解锁关卡：第${this.maxUnlockedLevel}关`);
                } else {
                    console.log(`✅ 启动关卡 ${level}`);
                    this.startLevel(parseInt(level));
                }
            });
        });
        console.log(`✅ 已为 ${levelCards.length} 个关卡卡片设置点击事件`);
        
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            // 防止页面滚动
            if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
                e.preventDefault();
            }
            
            this.keys[e.key] = true;
            
            // 快捷键支持
            if (e.key === 'Escape') {
                // ESC键返回菜单
                if (this.currentScreen === 'gameScreen') {
                    this.showScreen('levelSelect');
                }
            } else if (e.key === 'r' || e.key === 'R') {
                // R键重新开始关卡
                if (this.currentScreen === 'gameScreen') {
                    this.startLevel(this.currentLevel);
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // 按钮事件
        document.getElementById('backToMenu').addEventListener('click', () => {
            this.showScreen('levelSelect');
        });
        
        document.getElementById('nextLevel').addEventListener('click', () => {
            this.nextLevel();
        });
        
        document.getElementById('backToLevelSelect').addEventListener('click', () => {
            this.hideWinModal();
            this.showScreen('levelSelect');
        });
        
        // 重置进度按钮（仅供测试）
        const resetBtn = document.getElementById('resetProgress');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('🔄 用户点击重置进度按钮');
                if (confirm('确定要重置所有游戏进度吗？此操作无法撤销。')) {
                    // 清除localStorage
                    localStorage.removeItem('raccoon_adventure_progress');
                    console.log('🗑️ 已清除localStorage数据');
                    
                    // 重置内存中的进度
                    this.maxUnlockedLevel = 1;
                    console.log('🔄 重置内存中的maxUnlockedLevel = 1');
                    
                    // 立即更新UI
                    this.updateLevelCards();
                    console.log('🎯 已更新关卡卡片显示');
                    
                    // 显示确认消息
                    alert('✅ 进度已重置！只有第1关可玩。');
                    console.log('✅ 重置操作完成');
                } else {
                    console.log('❌ 用户取消了重置操作');
                }
            });
        } else {
            console.warn('⚠️ 重置按钮未找到');
        }
    }
    
    setupMobileControls() {
        // 显示移动端控制面板（为兼容性）
        const mobileControls = document.querySelector('.mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'block';
        }
        
        // 创建统一的按键处理函数
        const createButtonHandler = (keyName, buttonId) => {
            const button = document.getElementById(buttonId);
            if (!button) {
                console.warn(`Button not found: ${buttonId}`);
                return;
            }
            
            const press = () => {
                this.keys[keyName] = true;
                this.updateButtonVisualFeedback(buttonId, true);
            };
            
            const release = () => {
                this.keys[keyName] = false;
                this.updateButtonVisualFeedback(buttonId, false);
            };
            
            // 鼠标事件
            button.addEventListener('mousedown', press);
            button.addEventListener('mouseup', release);
            button.addEventListener('mouseleave', release);
            
            // 触摸事件
            button.addEventListener('touchstart', (e) => { e.preventDefault(); press(); });
            button.addEventListener('touchend', (e) => { e.preventDefault(); release(); });
        };
        
        // 方向键
        createButtonHandler('ArrowLeft', 'leftBtn');
        createButtonHandler('ArrowRight', 'rightBtn');
        createButtonHandler('ArrowUp', 'upBtn');
        createButtonHandler('ArrowDown', 'downBtn');
        
        // 动作键
        createButtonHandler(' ', 'jumpBtn');
        createButtonHandler('Enter', 'actionBtn');
    }
    
    updateButtonVisualFeedback(buttonId, pressed) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (pressed) {
                button.classList.add('pressed');
            } else {
                button.classList.remove('pressed');
            }
        }
    }
    
    setupGamepadSupport() {
        // 监听游戏手柄连接
        window.addEventListener('gamepadconnected', (e) => {
            console.log('🎮 Gamepad connected:', e.gamepad);
            this.connectGamepad(e.gamepad);
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('🎮 Gamepad disconnected:', e.gamepad);
            this.disconnectGamepad();
        });
        
        // 检查已连接的手柄
        setTimeout(() => {
            this.checkGamepads();
        }, 1000);
        
        // 定期检查手柄状态
        setInterval(() => {
            this.checkGamepads();
        }, 100);
    }
    
    checkGamepads() {
        const gamepads = navigator.getGamepads();
        
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (gamepad) {
                if (!this.gamepad.connected) {
                    this.connectGamepad(gamepad);
                }
                this.updateGamepadInput(gamepad);
                break;
            }
        }
    }
    
    connectGamepad(gamepad) {
        this.gamepad.connected = true;
        this.gamepad.index = gamepad.index;
        this.updateControllerStatus('connected', gamepad.id);
        console.log('✅ Gamepad connected:', gamepad.id);
    }
    
    disconnectGamepad() {
        this.gamepad.connected = false;
        this.gamepad.index = null;
        this.updateControllerStatus('disconnected');
        console.log('❌ Gamepad disconnected');
    }
    
    updateGamepadInput(gamepad) {
        if (!gamepad || !gamepad.connected) return;
        
        // 检查按键状态
        for (let i = 0; i < gamepad.buttons.length; i++) {
            const button = gamepad.buttons[i];
            const isPressed = button.pressed;
            
            if (this.gamepad.mapping[i]) {
                const action = this.gamepad.mapping[i];
                const wasPressed = this.gamepad.lastState[action] || false;
                
                if (isPressed && !wasPressed) {
                    // 按键刚被按下
                    this.handleGamepadInput(action, true);
                } else if (!isPressed && wasPressed) {
                    // 按键刚被释放
                    this.handleGamepadInput(action, false);
                }
                
                this.gamepad.lastState[action] = isPressed;
            }
        }
        
        // 检查模拟摇杆
        const leftStickX = gamepad.axes[0];
        if (Math.abs(leftStickX) > 0.3) {
            if (leftStickX > 0) {
                this.keys['ArrowRight'] = true;
                this.keys['ArrowLeft'] = false;
            } else {
                this.keys['ArrowLeft'] = true;
                this.keys['ArrowRight'] = false;
            }
        } else {
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
        }
    }
    
    handleGamepadInput(action, pressed) {
        switch (action) {
            case 'left':
                this.keys['ArrowLeft'] = pressed;
                break;
            case 'right':
                this.keys['ArrowRight'] = pressed;
                break;
            case 'jump':
                this.keys[' '] = pressed;
                break;
            case 'action':
                // 动作键可以根据需要添加功能
                break;
        }
        
        // 可视反馈
        this.updateButtonVisualFeedback(action, pressed);
    }
    
    updateButtonVisualFeedback(action, pressed) {
        let buttonId = '';
        switch (action) {
            case 'left': buttonId = 'leftBtn'; break;
            case 'right': buttonId = 'rightBtn'; break;
            case 'jump': buttonId = 'jumpBtn'; break;
            case 'up': buttonId = 'upBtn'; break;
            case 'down': buttonId = 'downBtn'; break;
        }
        
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                if (pressed) {
                    button.classList.add('pressed');
                } else {
                    button.classList.remove('pressed');
                }
            }
        }
    }
    
    updateControllerStatus(status, controllerName = '') {
        const statusElement = document.getElementById('controllerStatus');
        if (statusElement) {
            const icon = statusElement.querySelector('.status-icon');
            const text = statusElement.querySelector('.status-text');
            
            if (status === 'connected') {
                statusElement.className = 'controller-status connected';
                icon.textContent = '🎮';
                if (controllerName) {
                    // 识别手柄类型
                    let controllerType = '游戏手柄';
                    if (controllerName.includes('Xbox') || controllerName.includes('XInput')) {
                        controllerType = 'Xbox控制器';
                    } else if (controllerName.includes('PlayStation') || controllerName.includes('DualShock')) {
                        controllerType = 'PlayStation控制器';
                    } else if (controllerName.includes('Nintendo') || controllerName.includes('Joy-Con')) {
                        controllerType = 'Nintendo控制器';
                    }
                    text.textContent = `使用手柄：${controllerType}`;
                } else {
                    text.textContent = '已连接手柄';
                }
            } else {
                statusElement.className = 'controller-status disconnected';
                icon.textContent = '🎮';
                text.textContent = '未连接手柄';
            }
        }
    }
    
    showScreen(screenName) {
        // 隐藏所有屏幕
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 显示目标屏幕
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        this.currentScreen = screenName;
        
        if (screenName === 'gameScreen') {
            this.startGameLoop();
        } else {
            this.stopGameLoop();
        }
    }
    
    startLevel(level) {
        console.log(`🎮 开始启动第 ${level} 关...`);
        this.currentLevel = level;
        this.gameState = 'playing';
        this.keys = {}; // 清空按键状态
        
        try {
            // 重置游戏元素
            this.player = null;
            this.goal = null;
            this.ground = null;
            this.background = null;
            this.winCondition = null;
            this.movingPlatforms = null;
            this.staticPlatforms = null;
            this.stars = null;
            this.prevPlatformOffsets = null;
            this.timeChallenge = null; // 重置时间挑战状态
            
            // 先初始化关卡，再切换屏幕
            console.log(`🛠️ 开始初始化第 ${level} 关...`);
            this.initLevel(level);
            console.log(`✅ 第 ${level} 关初始化完成`);
            
            console.log('🎯 切换到游戏屏幕...');
            this.showScreen('gameScreen');
            console.log('🎉 游戏启动完成！');
        } catch (error) {
            console.error('❌ 启动关卡时发生错误:', error);
            alert(`启动第${level}关时发生错误: ${error.message}`);
        }
    }
    
    updateTimeChallenge() {
        if (!this.timeChallenge || !this.player) return;
        
        // 检查时间是否用完
        const elapsed = (Date.now() - this.timeChallenge.startTime) / 1000;
        const timeLeft = this.timeChallenge.timeLimit - elapsed;
        
        if (timeLeft <= 0 && this.gameState === 'playing') {
            this.timeChallenge.isTimeUp = true;
            this.gameState = 'timeUp';
            console.log('⏰ 时间到！挑战失败');
            // 可以显示时间到提示
            return;
        }
        
        // 检查是否通过检查点
        this.timeChallenge.checkpoints.forEach((checkpoint, index) => {
            if (!this.timeChallenge.passedCheckpoints.includes(index)) {
                const dx = (this.player.x + this.player.width/2) - checkpoint.x;
                const dy = (this.player.y + this.player.height/2) - checkpoint.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < 40) {
                    this.timeChallenge.passedCheckpoints.push(index);
                    console.log(`🏁 通过检查点 ${index + 1}: ${checkpoint.name}`);
                }
            }
        });
    }
    
    renderStarProgress() {
        const collected = this.stars.filter(s => s.collected).length;
        const total = this.stars.length;
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(`⭐ 星星: ${collected}/${total}`, 20, 40);
    }
    
    renderTimeChallenge() {
        if (!this.timeChallenge) return;
        
        // 计算剩余时间
        const elapsed = (Date.now() - this.timeChallenge.startTime) / 1000;
        const timeLeft = Math.max(0, this.timeChallenge.timeLimit - elapsed);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // 绘制时间倒计时
        this.ctx.fillStyle = timeLeft < 10 ? '#FF4444' : '#00AA00';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(`⏰ 时间: ${timeText}`, 20, 40);
        
        // 绘制检查点信息
        const passed = this.timeChallenge.passedCheckpoints.length;
        const total = this.timeChallenge.checkpoints.length;
        this.ctx.fillStyle = '#4444FF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText(`🏁 检查点: ${passed}/${total}`, 20, 70);
        
        // 绘制检查点标记
        this.timeChallenge.checkpoints.forEach((checkpoint, index) => {
            const isPassed = this.timeChallenge.passedCheckpoints.includes(index);
            const markerSize = 8;
            
            this.ctx.beginPath();
            this.ctx.arc(checkpoint.x, checkpoint.y, markerSize, 0, Math.PI * 2);
            this.ctx.fillStyle = isPassed ? '#00AA00' : '#FFD700';
            this.ctx.fill();
            
            // 添加检查点标签
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${index + 1}`, checkpoint.x, checkpoint.y + 4);
        });
        
        this.ctx.textAlign = 'left'; // 重置对齐
    }
    
    initLevel(level) {
        // 根据关卡初始化不同的游戏元素
        switch (level) {
            case 1:
                this.initLevel1();
                break;
            case 2:
                this.initLevel2();
                break;
            case 3:
                this.initLevel3();
                break;
            case 4:
                this.initLevel4();
                break;
            case 5:
                this.initLevel5();
                break;

        }
    }
    
    initLevel1() {
        // 第1关：小浣熊进入树洞
        this.player = new Raccoon(100, 450);
        this.goal = new TreeHole(650, 450);
        this.ground = new Ground(0, 500, 800, 100);
        this.background = new Background();
        
        // 统计数据初始化
        this.startTime = Date.now();
        this.collisions = 0;
        this.platformUses = 0; // 平台使用次数
        
        // 通关条件：玩家进入树洞
        this.winCondition = () => {
            if (!this.player || !this.goal) return false;
            const distance = Math.abs(this.player.x - this.goal.x);
            return distance < 30; // 玩家距离树洞30像素内
        };
        
        console.log('Level 1 initialized:', {
            player: this.player ? 'OK' : 'MISSING',
            goal: this.goal ? 'OK' : 'MISSING',
            ground: this.ground ? 'OK' : 'MISSING',
            background: this.background ? 'OK' : 'MISSING'
        });
    }
    
    initLevel2() {
        // 第2关：利用移动平台穿越障碍
        this.player = new Raccoon(50, 450);
        this.goal = new TreeHole(720, 450);
        this.ground = new Ground(0, 500, 800, 100);
        this.background = new Background();
        
        // 统计数据初始化
        this.startTime = Date.now();
        this.collisions = 0;
        this.platformUses = 0;
        
        // 创建移动平台数组
        this.movingPlatforms = [
            new MovingPlatform(200, 400, 80, 20, 'horizontal', 2, 60),  // 第一个平台
            new MovingPlatform(350, 350, 80, 20, 'vertical', 1.5, 40),   // 第二个平台
            new MovingPlatform(500, 400, 80, 20, 'horizontal', 2.5, 80), // 第三个平台
            new MovingPlatform(650, 300, 60, 20, 'vertical', 1, 50)      // 终点前的平台
        ];
        
        // 初始化平台使用状态
        this.movingPlatforms.forEach(platform => {
            platform.used = false;
        });
        
        // 通关条件：玩家进入树洞
        this.winCondition = () => {
            if (!this.player || !this.goal) return false;
            const distance = Math.abs(this.player.x - this.goal.x);
            return distance < 30;
        };
        
        console.log('Level 2 initialized:', {
            player: this.player ? 'OK' : 'MISSING',
            goal: this.goal ? 'OK' : 'MISSING',
            ground: this.ground ? 'OK' : 'MISSING',
            background: this.background ? 'OK' : 'MISSING',
            platforms: this.movingPlatforms ? this.movingPlatforms.length : 0
        });
    }

    initLevel3() {
        // 第3关：精准挑战 - 组合平台跳跃
        this.player = new Raccoon(50, 450);
        this.goal = new TreeHole(700, 450);
        this.ground = new Ground(0, 500, 800, 100);
        this.background = new Background();
        
        // 统计数据初始化
        this.startTime = Date.now();
        this.collisions = 0;
        this.platformUses = 0;
        
        // 移除所有移动平台，只保留静态平台（避免瞬移和穿模问题）
        this.movingPlatforms = null; // 彻底删除移动平台
        
        // 添加一些危险区域作为挑战（碰撞测试）
        this.dangerZones = [
            {x: 200, y: 480, width: 80, height: 20, type: 'spikes'},   // 尖刺区域
            {x: 350, y: 480, width: 80, height: 20, type: 'water'},     // 水池
            {x: 500, y: 480, width: 80, height: 20, type: 'spikes'}     // 更多尖刺
        ];
        
        // 精心设计的静态平台跳跃路径
        this.staticPlatforms = [
            new StaticPlatform(80, 450, 100, 20),   // 起始大平台
            new StaticPlatform(250, 420, 80, 20),   // 第一个跳跃目标
            new StaticPlatform(400, 380, 80, 20),   // 第二个跳跃目标
            new StaticPlatform(550, 350, 70, 20),   // 第三个跳跃目标（稍高）
            new StaticPlatform(650, 380, 80, 20),   // 终点前休息平台
        ];
        
        // 通关条件：玩家进入树洞
        this.winCondition = () => {
            if (!this.player || !this.goal) return false;
            const distance = Math.abs(this.player.x - this.goal.x);
            return distance < 30;
        };
        
        console.log('Level 3 initialized (Static Platforms Only):', {
            player: this.player ? 'OK' : 'MISSING',
            goal: this.goal ? 'OK' : 'MISSING',
            ground: this.ground ? 'OK' : 'MISSING',
            background: this.background ? 'OK' : 'MISSING',
            movingPlatforms: 'REMOVED', // 明确标记移动平台已移除
            staticPlatforms: this.staticPlatforms ? this.staticPlatforms.length : 0
        });
    }
    
    initLevel4() {
        // 第4关：收集星星 - 探索与收集
        this.player = new Raccoon(50, 450);
        this.goal = new TreeHole(700, 450);
        this.ground = new Ground(0, 500, 800, 100);
        this.background = new Background();
        
        // 移除所有移动平台，只使用静态平台辅助
        this.movingPlatforms = null; // 彻底删除移动平台
        this.staticPlatforms = null; // 第4关不需要额外平台
        
        // 创建星星收集系统
        this.stars = [
            new Star(150, 420),   // 基础高度星星
            new Star(300, 380),   // 中等高度星星
            new Star(450, 350),   // 稍高星星
            new Star(600, 380),   // 调整后高度（更容易跳跃）
            new Star(680, 360),   // 调整后高度（更容易跳跃）
        ];
        
        // 通关条件：收集所有星星 + 进入树洞
        this.winCondition = () => {
            if (!this.player || !this.goal) return false;
            
            // 检查所有星星是否收集完毕
            const allStarsCollected = this.stars.every(star => star.collected);
            
            // 检查是否进入树洞
            const nearGoal = Math.abs(this.player.x - this.goal.x) < 30;
            
            return allStarsCollected && nearGoal;
        };
        
        console.log('Level 4 initialized (Star Collection):', {
            player: this.player ? 'OK' : 'MISSING',
            goal: this.goal ? 'OK' : 'MISSING',
            ground: this.ground ? 'OK' : 'MISSING',
            background: this.background ? 'OK' : 'MISSING',
            stars: this.stars ? this.stars.length : 0,
            movingPlatforms: 'NONE', // 第4关无移动平台
            staticPlatforms: 'NONE'  // 第4关无静态平台
        });
        
        console.log('Level 4 initialized (Star Collection):', {
            player: this.player ? 'OK' : 'MISSING',
            goal: this.goal ? 'OK' : 'MISSING',
            ground: this.ground ? 'OK' : 'MISSING',
            background: this.background ? 'OK' : 'MISSING',
            stars: this.stars ? this.stars.length : 0,
            movingPlatforms: 'NONE', // 第4关无移动平台
            staticPlatforms: 'NONE'  // 第4关无静态平台
        });
    }
    
    initLevel5() {
        // 第5关：时间挑战 - 速度与技巧的考验
        this.player = new Raccoon(50, 450);
        this.goal = new TreeHole(750, 450);
        this.ground = new Ground(0, 500, 800, 100);
        this.background = new Background();
        
        // 移除所有平台，专注于速度挑战
        this.movingPlatforms = null;
        this.staticPlatforms = null;
        
        // 初始化时间挑战系统
        this.timeChallenge = {
            timeLimit: 30, // 30秒时间限制
            startTime: Date.now(),
            checkpoints: [
                {x: 200, y: 420, name: 'Checkpoint 1'},
                {x: 400, y: 380, name: 'Checkpoint 2'},
                {x: 600, y: 350, name: 'Checkpoint 3'}
            ],
            passedCheckpoints: [],
            isTimeUp: false
        };
        
        // 通关条件：30秒内到达终点
        this.winCondition = () => {
            if (!this.player || !this.goal) return false;
            
            // 检查是否到达终点
            const nearGoal = Math.abs(this.player.x - this.goal.x) < 30;
            
            // 检查时间是否未用完
            const elapsed = (Date.now() - this.timeChallenge.startTime) / 1000;
            const timeLeft = this.timeChallenge.timeLimit - elapsed;
            
            return nearGoal && timeLeft > 0;
        };
        
        console.log('Level 5 initialized (Time Challenge):', {
            player: this.player ? 'OK' : 'MISSING',
            goal: this.goal ? 'OK' : 'MISSING',
            ground: this.ground ? 'OK' : 'MISSING',
            background: this.background ? 'OK' : 'MISSING',
            timeLimit: this.timeChallenge.timeLimit,
            checkpoints: this.timeChallenge.checkpoints.length,
            movingPlatforms: 'NONE',
            staticPlatforms: 'NONE'
        });
    }
    

    
    nextLevel() {
        // 解锁下一关
        const nextLevelNum = this.currentLevel + 1;
        
        // 检查是否有下一关
        if (nextLevelNum > 5) {
            // 已通过最后一关，显示祝贺信息
            this.hideWinModal();
            this.showScreen('levelSelect');
            alert('🎉 恭喜您已通过所有关卡！');
            return;
        }
        
        // 更新最大解锁关卡
        if (nextLevelNum > this.maxUnlockedLevel) {
            this.maxUnlockedLevel = nextLevelNum;
            this.saveProgress();
            this.updateLevelCards();
            
            // 显示解锁动画
            const nextLevelCard = document.querySelector(`[data-level="${nextLevelNum}"]`);
            if (nextLevelCard) {
                nextLevelCard.style.animation = 'unlockAnimation 0.8s ease-out';
                setTimeout(() => {
                    nextLevelCard.style.animation = '';
                }, 800);
            }
        }
        
        this.hideWinModal();
        this.showScreen('levelSelect');
    }
    
    showWinModal() {
        const modal = document.getElementById('winModal');
        
        // 更新弹窗中的星星显示
        this.updateWinModalStars();
        
        modal.classList.add('show');
    }
    
    // 新增方法：更新胜利弹窗的星星显示
    updateWinModalStars() {
        const modalStars = document.querySelectorAll('#winModal .modal-star');
        const earnedStars = this.levelStars[this.currentLevel] || 0;
        
        modalStars.forEach((star, index) => {
            if (index < earnedStars) {
                star.textContent = '★';
                star.style.color = '#FFD700';
            } else {
                star.textContent = '☆';
                star.style.color = '#CCC';
            }
        });
        
        console.log(`🎊 胜利弹窗星星已更新: ${earnedStars} / 3`);
    }
    
    hideWinModal() {
        const modal = document.getElementById('winModal');
        modal.classList.remove('show');
    }
    
    startGameLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.gameLoop();
    }
    
    stopGameLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    drawProgress() {
        if (!this.stars || this.gameState !== 'playing') return;
        
        const collectedCount = this.stars.filter(star => star.collected).length;
        const totalStars = this.stars.length;
        
        // 绘制进度背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(10, 10, 200, 40);
        
        // 绘制进度文字
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`⭐ 收集进度: ${collectedCount}/${totalStars}`, 20, 35);
        
        // 绘制进度条
        const progressWidth = 180;
        const progressX = 20;
        const progressY = 45;
        
        // 背景条
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(progressX, progressY, progressWidth, 8);
        
        // 进度条
        const progress = collectedCount / totalStars;
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(progressX, progressY, progressWidth * progress, 8);
    }
    
    gameLoop() {
        this.update();
        this.render();
        
        if (this.currentScreen === 'gameScreen') {
            this.animationFrame = requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    update() {
        if (this.gameState === 'playing') {
            // 更新游戏手柄输入（每帧检查）
            if (this.gamepad.connected) {
                const gamepads = navigator.getGamepads();
                if (gamepads[this.gamepad.index]) {
                    this.updateGamepadInput(gamepads[this.gamepad.index]);
                }
            }
            
            // 更新移动平台（先更新所有平台位置）
            if (this.movingPlatforms) {
                this.movingPlatforms.forEach(platform => platform.update());
            }
            
            // 更新玩家输入和动画（但不处理物理和位置）
            if (this.player) {
                this.player.updateInputAndAnimation(this.keys);
                
                // 处理玩家与平台的碰撞和承载
                this.handlePlayerPlatformCollision();
                
                // 最后更新物理（基于碰撞后的groundY）
                this.player.updatePhysics();
            }
            
            // 更新星星状态和检查收集
            if (this.stars) {
                this.stars.forEach(star => {
                    star.update();
                    // 检查玩家是否收集到星星
                    if (star.checkCollection(this.player)) {
                        star.collected = true;
                        console.log('⭐ 星星收集成功！剩余:', this.stars.filter(s => !s.collected).length);
                    }
                });
            }
            
            // 更新时间挑战系统
            if (this.timeChallenge) {
                this.updateTimeChallenge();
            }
            
            // 检查危险区域碰撞
            if (this.dangerZones) {
                for (let danger of this.dangerZones) {
                    if (this.checkPlayerCollisionWithDanger(danger)) {
                        this.collisions = (this.collisions || 0) + 1;
                        console.log(`💥 玩家碰撞! 总碰撞次数: ${this.collisions}`);
                        // 可以在这里添加碰撞效果，如画面闪烁、声音等
                    }
                }
            }
            
            // 检查通关条件
            if (this.winCondition && this.winCondition()) {
                this.gameState = 'won';
                
                // 通关后更新星星数量并保存进度
                this.updateLevelStars();
                
                this.showWinModal();
            }
        }
    }
    
    // 危险区域碰撞检测
    checkPlayerCollisionWithDanger(danger) {
        if (!this.player) return false;
        
        const playerLeft = this.player.x;
        const playerRight = this.player.x + this.player.width;
        const playerTop = this.player.y;
        const playerBottom = this.player.y + this.player.height;
        
        const dangerLeft = danger.x;
        const dangerRight = danger.x + danger.width;
        const dangerTop = danger.y;
        const dangerBottom = danger.y + danger.height;
        
        // 简单的AABB碰撞检测
        return !(playerRight < dangerLeft || 
                 playerLeft > dangerRight || 
                 playerBottom < dangerTop || 
                 playerTop > dangerBottom);
    }
    
    handlePlayerPlatformCollision() {
        if (!this.player) return;
        
        let onPlatform = false;
        
        // 首先检查移动平台
        if (this.movingPlatforms) {
            for (let platform of this.movingPlatforms) {
                if (platform.checkPlayerCollision(this.player)) {
                    onPlatform = true;
                    
                    // 记录平台使用（如果这是首次使用该平台）
                    if (!platform.used) {
                        platform.used = true;
                        this.platformUses = (this.platformUses || 0) + 1;
                        console.log(`🏗️ 平台使用: ${this.platformUses}/${this.movingPlatforms.length}`);
                    }
                    
                    // 更新地面高度
                    this.player.groundY = platform.y;
                    this.player.isJumping = false;
                    this.player.jumpVelocity = 0;
                    
                    // 处理移动平台的“携带”效果
                    // 只在物理更新阶段才移动位置，避免冲突
                    this.player.carriedByPlatform = platform;
                    
                    break; // 只站在第一个检测到的平台上
                }
            }
        }
        
        // 如果不在移动平台上，检查静态平台
        if (!onPlatform && this.staticPlatforms) {
            for (let platform of this.staticPlatforms) {
                if (platform.checkPlayerCollision(this.player)) {
                    onPlatform = true;
                    this.player.groundY = platform.y;
                    this.player.isJumping = false;
                    this.player.jumpVelocity = 0;
                    this.player.carriedByPlatform = null; // 清除携带状态
                    break;
                }
            }
        }
        
        // 如果不在任何平台上，恢复到地面高度
        if (!onPlatform && this.ground) {
            this.player.groundY = 500;
            this.player.carriedByPlatform = null; // 清除携带状态
        }
    }
    
    render() {
        // 保存当前上下文状态
        this.ctx.save();
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.currentScreen === 'gameScreen') {
            try {
                // 更新游戏元素
                if (this.background) {
                    this.background.update();
                    this.background.render(this.ctx);
                }
                if (this.ground) this.ground.render(this.ctx);
                if (this.movingPlatforms) {
                    this.movingPlatforms.forEach(platform => platform.render(this.ctx));
                }
                if (this.staticPlatforms) {
                    this.staticPlatforms.forEach(platform => platform.render(this.ctx));
                }
                if (this.goal) this.goal.render(this.ctx);
                if (this.stars) this.stars.forEach(star => star.render(this.ctx));
                if (this.player) this.player.render(this.ctx);
                
                // 绘制进度提示和游戏信息
                if (this.currentLevel === 4 && this.stars) {
                    this.renderStarProgress();
                } else if (this.currentLevel === 5 && this.timeChallenge) {
                    this.renderTimeChallenge();
                }
            } catch (error) {
                console.error('Render error:', error);
            }
        }
        
        // 恢复上下文状态
        this.ctx.restore();
    }
}

// 背景类
class Background {
    constructor() {
        this.clouds = [];
        this.initClouds();
    }
    
    initClouds() {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * 800,
                y: Math.random() * 200 + 50,
                speed: Math.random() * 0.5 + 0.2,
                size: Math.random() * 30 + 20
            });
        }
    }
    
    update() {
        this.clouds.forEach(cloud => {
            cloud.x += cloud.speed;
            if (cloud.x > 830) {
                cloud.x = -cloud.size;
            }
        });
    }
    
    render(ctx) {
        // 绘制天空渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, 600);
        gradient.addColorStop(0, '#A0DDFE');
        gradient.addColorStop(1, '#87CEEB');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);
        
        // 绘制云朵
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.8, cloud.y, cloud.size * 0.7, 0, Math.PI * 2);
            ctx.arc(cloud.x - cloud.size * 0.8, cloud.y, cloud.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// 移动平台类
class MovingPlatform {
    constructor(x, y, width, height, direction = 'horizontal', speed = 1, range = 100) {
        this.originalX = x;
        this.originalY = y;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.direction = direction; // 'horizontal' 或 'vertical'
        this.speed = speed;
        this.range = range; // 移动范围
        this.minPos = 0;
        this.maxPos = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isMoving = false;
        
        // 设置移动边界
        if (direction === 'horizontal') {
            this.minPos = x - range;
            this.maxPos = x + range;
        } else {
            this.minPos = y - range;
            this.maxPos = y + range;
        }
    }
    
    update() {
        // 移动平台位置
        if (this.direction === 'horizontal') {
            this.offsetX += this.speed;
            this.x = this.originalX + Math.sin(this.offsetX * 0.02) * this.range;
            this.isMoving = Math.abs(Math.cos(this.offsetX * 0.02)) > 0.1;
        } else {
            this.offsetY += this.speed;
            this.y = this.originalY + Math.sin(this.offsetY * 0.02) * this.range;
            this.isMoving = Math.abs(Math.cos(this.offsetY * 0.02)) > 0.1;
        }
    }
    
    render(ctx) {
        // 绘制移动平台
        ctx.fillStyle = this.isMoving ? '#FF6B6B' : '#4ECDC4';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 添加边框
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // 绘制移动指示器
        if (this.isMoving) {
            ctx.fillStyle = '#F39C12';
            const arrowX = this.x + this.width / 2;
            const arrowY = this.y + this.height / 2;
            
            ctx.beginPath();
            if (this.direction === 'horizontal') {
                const dir = Math.sign(Math.cos(this.offsetX * 0.02));
                ctx.moveTo(arrowX - 8 * dir, arrowY - 6);
                ctx.lineTo(arrowX + 8 * dir, arrowY);
                ctx.lineTo(arrowX - 8 * dir, arrowY + 6);
            } else {
                const dir = Math.sign(Math.cos(this.offsetY * 0.02));
                ctx.moveTo(arrowX - 6, arrowY - 8 * dir);
                ctx.lineTo(arrowX, arrowY + 8 * dir);
                ctx.lineTo(arrowX + 6, arrowY - 8 * dir);
            }
            ctx.closePath();
            ctx.fill();
        }
    }
    
    // 检查玩家是否站在平台上
    checkPlayerCollision(player) {
        if (!player) return false;
        
        // 简单的地板逻辑：只要玩家在平台上方就算
        const playerBottom = player.y + player.height;
        const platformTop = this.y;
        
        // 水平重叠检查
        const horizontalOverlap = (player.x + player.width > this.x && 
                                  player.x < this.x + this.width);
        
        // 垂直距离检查 - 大幅增加容错空间（就像地板一样）
        const verticalDistance = Math.abs(playerBottom - platformTop);
        const isCloseToPlatform = verticalDistance <= 30; // 30像素容错，像地板一样
        
        // 简化的检测逻辑：水平重叠 + 接近平台
        return horizontalOverlap && isCloseToPlatform;
    }
}

// 地面类
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    render(ctx) {
        // 绘制静态平台
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制平台边缘
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(this.x, this.y, this.width, 4);
        
        // 绘制平台阴影
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(this.x + 2, this.y + 2, this.width, this.height);
    }
}

class Ground {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    render(ctx) {
        // 绘制草地
        ctx.fillStyle = '#6DD47E';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制地面轮廓
        ctx.fillStyle = '#B88A68';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 20);
        for (let i = 0; i <= this.width; i += 40) {
            const waveY = this.y + 20 + Math.sin(i * 0.05) * 3; // 降低速度，从0.1改为0.05，降低振幅
            ctx.lineTo(this.x + i, waveY);
        }
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // 绘制小草（更慢的动画）
        ctx.fillStyle = '#5CB85C';
        const time = Date.now() * 0.0005; // 更慢的动画速度
        for (let i = 20; i < this.width; i += 60) {
            const grassHeight = 10 + Math.sin(time + i * 0.1) * 3; // 更小的摆动
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y + 10);
            ctx.lineTo(this.x + i - 3, this.y + 10 - grassHeight);
            ctx.lineTo(this.x + i + 3, this.y + 10 - grassHeight);
            ctx.closePath();
            ctx.fill();
        }
    }
}

// 静态平台类
class StaticPlatform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    render(ctx) {
        // 绘制静态平台
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制平台纹理
        ctx.fillStyle = '#A0522D';
        for (let i = 0; i < this.width; i += 15) {
            ctx.fillRect(this.x + i, this.y + 5, 3, this.height - 10);
        }
    }
    
    // 检查玩家是否站在平台上 - 简化为地板逻辑
    checkPlayerCollision(player) {
        if (!player) return false;
        
        // 简单的地板逻辑：只要玩家在平台上方就算
        const playerBottom = player.y + player.height;
        const platformTop = this.y;
        
        // 水平重叠检查
        const horizontalOverlap = (player.x + player.width > this.x && 
                                  player.x < this.x + this.width);
        
        // 垂直距离检查 - 大幅增加容错空间（就像地板一样）
        const verticalDistance = Math.abs(playerBottom - platformTop);
        const isCloseToPlatform = verticalDistance <= 30; // 30像素容错，像地板一样
        
        // 简化的检测逻辑：水平重叠 + 接近平台
        return horizontalOverlap && isCloseToPlatform;
    }
}

// 树洞类
class TreeHole {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 100;
        this.glowTime = 0;
    }
    
    render(ctx) {
        this.glowTime += 0.05;
        const glow = Math.sin(this.glowTime) * 0.3 + 0.7;
        
        // 绘制树
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x - 20, this.y - 150, 40, 150);
        
        // 绘制树洞发光效果
        ctx.shadowColor = `rgba(255, 215, 0, ${glow * 0.5})`;
        ctx.shadowBlur = 20;
        
        // 绘制树洞
        ctx.fillStyle = '#2F1B14';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 30, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 重置阴影
        ctx.shadowBlur = 0;
        
        // 绘制树洞边缘
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 30, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 星星收集类
class Star {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2; // 随机开始位置
        this.glowTime = 0;
    }
    
    update() {
        this.glowTime += 0.05;
        this.bobOffset += 0.03; // 上下浮动
    }
    
    render(ctx) {
        if (this.collected) return;
        
        const time = Date.now() * 0.003;
        const bobY = this.y + Math.sin(this.bobOffset + time) * 3;
        const glow = Math.sin(this.glowTime) * 0.3 + 0.7;
        
        // 绘制星星发光效果
        ctx.save();
        ctx.shadowColor = `rgba(255, 215, 0, ${glow * 0.6})`;
        ctx.shadowBlur = 15;
        
        // 绘制五角星
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? this.width / 2 : this.width / 4;
            const x = this.x + Math.cos(angle - Math.PI / 2) * radius;
            const y = bobY + Math.sin(angle - Math.PI / 2) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // 星星内部装饰
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const radius = this.width / 4;
            const x = this.x + Math.cos(angle) * radius;
            const y = bobY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    // 检查玩家是否收集到星星
    checkCollection(player) {
        if (this.collected) return false;
        
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const starCenterX = this.x;
        const starCenterY = this.y;
        
        const distance = Math.sqrt(
            Math.pow(playerCenterX - starCenterX, 2) + 
            Math.pow(playerCenterY - starCenterY, 2)
        );
        
        return distance < 30; // 30像素收集范围
    }
}

// 小浣熊类
class Raccoon {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 40;
        this.velocity = 0;
        this.speed = 2;
        this.direction = 1; // 1: 右, -1: 左
        this.animationTime = 0;
        this.isMoving = false;
        this.groundY = y;
        
        // 跳跃相关属性 - 增加跳跃力
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.gravity = 0.8;
        this.jumpPower = 16; // 从12增加到16，提升跳跃高度
        
        // 平台承载相关
        this.carriedByPlatform = null; // 当前承载玩家的平台
        
        // 动画状态
        this.state = 'wakingUp'; // wakingUp, idle, walking, jumping
        this.stateTime = 0;
    }
    
    updateInputAndAnimation(keys) {
        this.animationTime += 0.1;
        this.stateTime += 0.1;
        
        // 跳跃处理
        if (keys[' '] || keys['Space']) {
            if (!this.isJumping && this.state !== 'wakingUp') {
                this.jump();
            }
        }
        
        // 状态机（但不包括位置更新）
        switch (this.state) {
            case 'wakingUp':
                this.wakingUpAnimation();
                break;
            case 'idle':
                this.idleAnimation();
                if (keys['ArrowLeft'] || keys['ArrowRight']) {
                    this.state = 'walking';
                    this.isMoving = true;
                }
                if (this.isJumping) {
                    this.state = 'jumping';
                }
                break;
            case 'walking':
                this.handleMovement(keys);
                if (!keys['ArrowLeft'] && !keys['ArrowRight']) {
                    this.state = 'idle';
                    this.isMoving = false;
                }
                if (this.isJumping) {
                    this.state = 'jumping';
                }
                break;
            case 'jumping':
                this.handleJumping();
                this.handleMovement(keys); // 跳跃时也可以水平移动
                if (!this.isJumping) {
                    this.state = 'idle';
                }
                break;
        }
    }
    
    update(keys) {
        // 新的统一更新方法（兼容旧调用）
        this.updateInputAndAnimation(keys);
        this.updatePhysics();
    }
    
    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpVelocity = -this.jumpPower;
        }
    }
    
    handleJumping() {
        // 跳跃时的动画逻辑
    }
    
    updatePhysics() {
        if (this.isJumping) {
            this.jumpVelocity += this.gravity;
            this.y += this.jumpVelocity;
            
            // 着地检测 - 检查是否已经落地或者站在平台上
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        } else {
            // 如果不在跳跃状态，只在需要时调整位置，避免瞬移
            if (Math.abs(this.y - this.groundY) > 1) {
                this.y = this.groundY;
            }
            
            // 处理移动平台的“携带”效果
            if (this.carriedByPlatform) {
                const platform = this.carriedByPlatform;
                
                // 只在平台确实在移动时才更新位置
                if (platform.direction === 'horizontal') {
                    const platformPrevX = platform.x - (platform.offsetX || 0);
                    const platformCurrentX = platform.x;
                    const deltaX = platformCurrentX - platformPrevX;
                    
                    if (Math.abs(deltaX) > 0.1) { // 只有在平台显著移动时才应用
                        this.x += deltaX;
                    }
                } else if (platform.direction === 'vertical') {
                    const platformPrevY = platform.y - (platform.offsetY || 0);
                    const platformCurrentY = platform.y;
                    const deltaY = platformCurrentY - platformPrevY;
                    
                    if (Math.abs(deltaY) > 0.1) {
                        this.y += deltaY;
                    }
                }
            }
        }
    }
    
    wakingUpAnimation() {
        // 起身动画：3秒后进入待机状态
        if (this.stateTime > 3) {
            this.state = 'idle';
            this.stateTime = 0;
        }
    }
    
    idleAnimation() {
        // 待机动画：只更新动画状态，不更新位置
        // 位置更新现在由物理系统处理
    }
    
    handleMovement(keys) {
        let newX = this.x;
        
        if (keys['ArrowLeft']) {
            newX -= this.speed;
            this.direction = -1;
        }
        if (keys['ArrowRight']) {
            newX += this.speed;
            this.direction = 1;
        }
        
        // 边界检测
        if (newX >= 50 && newX <= 750) {
            this.x = newX;
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // 移动到浣熊位置
        ctx.translate(this.x, this.y);
        
        // 翻转（根据方向）
        if (this.direction === -1) {
            ctx.scale(-1, 1);
        }
        
        this.drawRaccoon(ctx);
        
        ctx.restore();
    }
    
    drawRaccoon(ctx) {
        // 根据状态绘制不同的动画
        switch (this.state) {
            case 'wakingUp':
                this.drawWakingUp(ctx);
                break;
            case 'idle':
                this.drawIdle(ctx);
                break;
            case 'walking':
                this.drawWalking(ctx);
                break;
            case 'jumping':
                this.drawJumping(ctx);
                break;
        }
    }
    
    drawWakingUp(ctx) {
        const progress = Math.min(this.stateTime / 3, 1);
        const scale = 0.5 + progress * 0.5;
        const lift = (1 - progress) * 20;
        
        ctx.scale(scale, scale);
        ctx.translate(0, -lift);
        
        this.drawBaseRaccoon(ctx);
    }
    
    drawIdle(ctx) {
        this.drawBaseRaccoon(ctx);
    }
    
    drawWalking(ctx) {
        const walkCycle = Math.sin(this.animationTime * 6); // 减慢走路动画速度
        const legOffset = walkCycle * 4; // 减少腿部摆动幅度
        const bodyBounce = Math.abs(walkCycle) * 2; // 减少身体弹跳
        
        ctx.translate(0, -bodyBounce);
        this.drawBaseRaccoon(ctx, legOffset);
    }
    
    drawJumping(ctx) {
        // 跳跃时的压缩效果
        const jumpSquash = this.jumpVelocity < 0 ? 0.8 : 1.2; // 上升时压缩，落下时伸展
        ctx.scale(1, jumpSquash);
        this.drawBaseRaccoon(ctx);
    }
    
    drawBaseRaccoon(ctx, legOffset = 0) {
        const bodyColor = '#4A3F35';      // 深灰色主体
        const grayColor = '#A89C93';      // 浅灰色斑纹
        const blackColor = '#000000';     // 纯黑色
        const whiteColor = '#FFFFFF';     // 纯白色
        
        // 绘制浣熊的标志性长尾巴
        ctx.fillStyle = grayColor;
        ctx.beginPath();
        ctx.ellipse(-25, -5, 10, 30, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // 尾巴的黑色条纹（浣熊特征）
        ctx.fillStyle = blackColor;
        for (let i = 0; i < 4; i++) {
            const y = -20 + i * 12;
            ctx.beginPath();
            ctx.ellipse(-25, y, 8, 6, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 绘制更圆胖的身体
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, -10, 22, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制浅色的腹部
        ctx.fillStyle = grayColor;
        ctx.beginPath();
        ctx.ellipse(0, -5, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制更圆的头部
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(12, -25, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 浣熊的标志性"眼罩"（黑色区域）
        ctx.fillStyle = blackColor;
        ctx.beginPath();
        ctx.ellipse(6, -25, 8, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(18, -25, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼罩内的白色小眼睛
        ctx.fillStyle = whiteColor;
        ctx.beginPath();
        ctx.ellipse(6, -25, 3, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(18, -25, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼珠（黑色小点）
        ctx.fillStyle = blackColor;
        ctx.beginPath();
        ctx.arc(6, -25, 1, 0, Math.PI * 2);
        ctx.arc(18, -25, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // 浣熊的黑白相间脸部
        ctx.fillStyle = whiteColor;
        ctx.beginPath();
        ctx.ellipse(12, -18, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 黑色鼻子
        ctx.fillStyle = blackColor;
        ctx.beginPath();
        ctx.arc(12, -18, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 嘴巴线条
        ctx.strokeStyle = blackColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(12, -16);
        ctx.lineTo(12, -14);
        ctx.stroke();
        
        // 小耳朵（比猫更圆）
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(6, -32, 5, 0, Math.PI * 2);
        ctx.arc(18, -32, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 耳朵内侧
        ctx.fillStyle = grayColor;
        ctx.beginPath();
        ctx.arc(6, -32, 3, 0, Math.PI * 2);
        ctx.arc(18, -32, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 较粗的腿部
        ctx.fillStyle = bodyColor;
        
        // 后腿（更粗壮）
        ctx.beginPath();
        ctx.ellipse(-10, 3 + legOffset, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 前腿
        ctx.beginPath();
        ctx.ellipse(10, 3 - legOffset, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 小爪子
        ctx.fillStyle = blackColor;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.arc(-10 + i * 2, 8 + legOffset, 1, 0, Math.PI * 2);
            ctx.arc(10 + i * 2, 8 - legOffset, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, starting game...');
    
    // 简单的Canvas测试
    const testCanvas = () => {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('❌ Canvas element not found!');
            return false;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Canvas context not available!');
            return false;
        }
        
        // 绘制一个简单的测试画面
        ctx.fillStyle = '#A0DDFE';
        ctx.fillRect(0, 0, 800, 600);
        
        ctx.fillStyle = '#4A3F35';
        ctx.font = '24px Fredoka One';
        ctx.textAlign = 'center';
        ctx.fillText('🎮 正在加载游戏...', 400, 300);
        
        console.log('✅ Canvas test passed');
        return true;
    };
    
    // 延迟启动游戏，确保DOM完全就绪
    setTimeout(() => {
        if (testCanvas()) {
            new RaccoonAdventure();
        }
    }, 200);
});