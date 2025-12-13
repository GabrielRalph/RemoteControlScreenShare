import { click, move, mouseDown, mouseUp, createOverlayFrame } from './module-template.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('1. Creating overlay frame...');
  await createOverlayFrame();
  await sleep(1000);

  console.log('2. Moving mouse to (400, 400)...');
  await move(400, 400);
  await sleep(500);

  console.log('3. Clicking at (80, 140)...');
  await click(80, 140);
  await sleep(500);

  console.log('4. Testing drag selection: from (435, 180) to (800, 180)...');
  await move(435, 180);
  await sleep(200);
  await mouseDown();
  await sleep(100);
  await move(800, 180);
  await sleep(200);
  await mouseUp();
  await sleep(500);

  console.log('Test completed! Overlay window will remain visible.');
}

main().catch(console.error);
