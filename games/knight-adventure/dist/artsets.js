/* All frames are real painted poses. Loaded and cached once by KnightGame. */
(function () {
  'use strict';
  const seq = n => Array.from({length:n},(_,i)=>i);
  const attack = (src, rising=false) => ({
    src,cols:4,rows:3,indices:seq(12),drawWidth:230,pivotX:.5,pivotY:.92,
    windupFrames:rising?[0,1,2,3,4]:[0,1,2,3,4,5,6],
    activeFrames:rising?[5,6,7,8]:[7,8],recoveryFrames:[9,10,11]
  });
  window.KNIGHT_ARTSETS = {
    version:'basketball-mount-20261112',
    attacks:[
      attack('assets/combat-light1-noball.png'),attack('assets/combat-light2-noball.png'),
      attack('assets/combat-light3-noball.png',true),attack('assets/combat-heavy4-noball.png')
    ],
    guard:{src:'assets/guard-jump-noball.png',cols:4,rows:3,indices:[0,1,2,3],drawWidth:230,pivotX:.5,pivotY:.92},
    jump:{src:'assets/guard-jump-noball.png',cols:4,rows:3,indices:[4,5,6,7,8,9,10,11],drawWidth:230,pivotX:.5,pivotY:.92},
    mount:{sampleInset:1,frameTrim:{6:{left:14}},src:'assets/mount-move.png',cols:4,rows:2,indices:seq(8),drawWidth:270,pivotX:.5,pivotY:.88,saddleX:-8,saddleY:-126},
    mountIdle:{src:'assets/mount-idle.png',cols:1,rows:1,indices:[0],drawWidth:270,pivotX:.5,pivotY:.96,saddleX:0,saddleY:-113},
    rider:{sampleInset:1,src:'assets/rider-side.png',cols:4,rows:2,indices:seq(8),drawWidth:185,pivotX:.5,pivotY:.64},
    ranged:{src:'assets/basketball-throw.png',cols:4,rows:2,indices:seq(8),drawWidth:230,pivotX:.5,pivotY:.94},
    rangedRider:{sampleInset:1,src:'assets/basketball-rider-side-throw.png',cols:4,rows:2,indices:seq(8),drawWidth:185,pivotX:.5,pivotY:.64}
  };
})();
