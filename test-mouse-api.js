const { click, move, mouseDown, mouseUp, createOverlayFrame } = require('./module-template');

console.log('=== Mouse Interface API Test ===\n');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMouseAPI() {
    try {
        console.log('1. Creating overlay frame...');
        createOverlayFrame();
        await sleep(1000);
        
        console.log('2. Testing mouse movement...');
        console.log('   Moving to (500, 500)');
        move(500, 500);
        await sleep(1000);
        
        console.log('   Moving to (800, 500)');
        move(800, 500);
        await sleep(1000);
        
        console.log('   Moving to (800, 300)');
        move(800, 300);
        await sleep(1000);
        
        console.log('   Moving to (500, 300)');
        move(500, 300);
        await sleep(1000);
        
        console.log('\n3. Testing click at current position...');
        click(500, 300);
        await sleep(1000);
        
        console.log('\n4. Testing mouse down/up (drag simulation)...');
        console.log('   Mouse down at (600, 400)');
        move(600, 400);
        await sleep(500);
        mouseDown();
        await sleep(500);
        
        console.log('   Moving while button is down (dragging)...');
        move(700, 400);
        await sleep(500);
        move(700, 500);
        await sleep(500);
        move(600, 500);
        await sleep(500);
        
        console.log('   Mouse up');
        mouseUp();
        await sleep(1000);
        
        console.log('\n5. Testing rapid clicks...');
        for (let i = 0; i < 3; i++) {
            console.log(`   Click ${i + 1}`);
            click(650, 450);
            await sleep(300);
        }
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\nWhat you should have seen:');
        console.log('- Purple overlay border appeared on screen');
        console.log('- Mouse moved in a square pattern');
        console.log('- Mouse clicked at center');
        console.log('- Mouse dragged in a square');
        console.log('- Three rapid clicks');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

console.log('Starting tests in 2 seconds...');
console.log('Watch your mouse cursor!\n');

setTimeout(() => {
    testMouseAPI();
}, 2000);
