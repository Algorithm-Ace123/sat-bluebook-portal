const { calculateSectionScore } = require('../lib/scoring');

function sampleRW() {
  console.log('Reading & Writing digital mapping samples:');
  [54,50,46,40,30,20,10,0].forEach(r => {
    const s = calculateSectionScore(r, 54, 0, 0, 'RW', 'digital');
    console.log(`raw ${r} -> ${s}`);
  });
}

function sampleMath() {
  console.log('\nMath digital mapping samples:');
  [44,40,36,30,20,12,6,0].forEach(r => {
    const s = calculateSectionScore(r, 44, 0, 0, 'MATH', 'digital');
    console.log(`raw ${r} -> ${s}`);
  });
}

sampleRW();
sampleMath();
