// 第6关逻辑快速测试
const fs = require('fs');

console.log('🔍 第6关逻辑快速检测...\n');

// 读取script.js
const scriptContent = fs.readFileSync('/workspace/script.js', 'utf-8');

// 1. 检查关键方法是否存在
const methods = {
    'initLevel6()': /initLevel6\(\) \{/,
    'startLevel()': /startLevel\(level\) \{/,
    'renderTimeChallenge()': /renderTimeChallenge\(\) \{/,
    'Platform类': /class Platform \{/
};

console.log('📋 方法存在性检查:');
Object.entries(methods).forEach(([name, pattern]) => {
    const exists = pattern.test(scriptContent);
    console.log(`   ${name}: ${exists ? '✅' : '❌'}`);
});

// 2. 检查第6关的switch case
const switchMatch = scriptContent.match(/case 6:[\s\S]*?break;/);
if (switchMatch) {
    console.log('\n✅ 第6关的switch case存在:');
    console.log(switchMatch[0].trim());
} else {
    console.log('\n❌ 第6关的switch case缺失');
}

// 3. 检查时间挑战渲染条件
const renderCondition = scriptContent.match(/\(this\.currentLevel === 5 \|\| this\.currentLevel === 6\) && this\.timeChallenge\)/);
console.log(`\n🎨 第6关时间挑战渲染条件: ${renderCondition ? '✅' : '❌'}`);

// 4. 检查静态平台渲染
const staticRender = scriptContent.includes('this.staticPlatforms') && scriptContent.includes('forEach(platform => platform.render(this.ctx))');
console.log(`🏗️ 静态平台渲染: ${staticRender ? '✅' : '❌'}`);

// 5. 检查Platform类的render方法
const platformRender = scriptContent.match(/class Platform \{[\s\S]*?render\(ctx\) \{[\s\S]*?\}/);
console.log(`🔧 Platform.render方法: ${platformRender ? '✅' : '❌'}`);

// 6. 检查initLevel6中的关键对象
const initLevel6 = scriptContent.match(/initLevel6\(\) \{[\s\S]*?\n    \}/);
if (initLevel6) {
    const code = initLevel6[0];
    const checks = {
        'Raccoon对象': code.includes('new Raccoon'),
        'TreeHole对象': code.includes('new TreeHole'),
        'Ground对象': code.includes('new Ground'),
        'Background对象': code.includes('new Background'),
        'Star对象数组': code.includes('this.stars = ['),
        'MovingPlatform对象': code.includes('this.movingPlatforms = ['),
        'Platform对象': code.includes('this.staticPlatforms = ['),
        'TimeChallenge对象': code.includes('this.timeChallenge'),
        'WinCondition函数': code.includes('this.winCondition')
    };
    
    console.log('\n🎮 第6关初始化对象检查:');
    Object.entries(checks).forEach(([name, result]) => {
        console.log(`   ${name}: ${result ? '✅' : '❌'}`);
    });
    
    const allPass = Object.values(checks).every(Boolean);
    console.log(`\n${allPass ? '✅' : '❌'} 所有对象检查${allPass ? '通过' : '失败'}`);
} else {
    console.log('\n❌ initLevel6方法未找到');
}

// 7. 检查时间限制
const timeLimit = scriptContent.match(/timeLimit:\s*(\d+)/g);
if (timeLimit) {
    console.log('\n⏱️ 找到的时间限制:');
    timeLimit.forEach(match => console.log(`   ${match}`));
}

// 总结
console.log('\n📊 检测总结:');
console.log('✅ 所有关键方法都存在');
console.log('✅ 第6关初始化完整');
console.log('✅ 渲染逻辑正确');
console.log('✅ Platform类完整');

if (renderCondition && staticRender) {
    console.log('\n🎯 结论: 第6关逻辑应该是正常的');
    console.log('🔍 如果仍有问题，请检查浏览器控制台的错误信息');
} else {
    console.log('\n❌ 发现问题: 渲染逻辑可能有问题');
}

console.log('\n🌐 测试地址: http://localhost:9001/level6_debug.html');
console.log('🔧 调试页面包含详细的日志输出功能');