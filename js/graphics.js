import {
  W, H, GROUND_Y,
  WARM_THEMES, THEMES,
  COL_SKIN, COL_JACKET, COL_JACKET_LIGHT, COL_JACKET_DARK, COL_COLLAR, COL_SHORT
} from './config.js';
import { state, dino, ctx, currentHead } from './state.js';

// Helper: draw a limb pivoting from its TOP, hanging down
function drawLimb(pivotX, pivotY, w, h, angle) {
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);
  ctx.beginPath();
  const r = Math.min(w, h) * 0.35;
  ctx.roundRect(-w / 2, 0, w, h, r);
  ctx.fill();
  ctx.restore();
}

function drawJacket(x, y, w, h, side) {
  ctx.fillStyle = COL_JACKET;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();

  const segH = h / 3;
  for (let i = 0; i < 3; i++) {
    const yTop = y + segH * i;
    ctx.fillStyle = COL_JACKET_LIGHT;
    ctx.beginPath();
    ctx.roundRect(x + 2, yTop + 1, w - 4, 2, 1);
    ctx.fill();
  }
  ctx.strokeStyle = COL_JACKET_DARK;
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const yi = y + segH * i;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, yi);
    ctx.lineTo(x + w - 1.5, yi);
    ctx.stroke();
  }

  ctx.fillStyle = COL_COLLAR;
  ctx.beginPath();
  ctx.roundRect(x + 1, y - 3, w - 2, 5, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(x + 2, y + 1, w - 4, 1);

  if (side === 'front') {
    ctx.strokeStyle = COL_JACKET_DARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h - 1);
    ctx.stroke();
  }
}

export function drawDino() {
  const HEAD_SIZE = 36;

  if (!state.isIOSDevice) {
    const shadowScale = dino.jumping
      ? Math.max(0.4, 1 - (GROUND_Y - dino.y) / 140)
      : 1;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.18 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(dino.x + 14, GROUND_Y + 2, 18 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!dino.jumping && !dino.ducking && state.gameState === 'running') {
    dino.runCycle += state.speed * 0.025;
    dino.landTimer++;
  }

  const squashTarget = 1;
  const squashSpring = 0.3;
  const squashDamp = 0.65;
  dino.squashVel += (squashTarget - dino.squash) * squashSpring;
  dino.squashVel *= squashDamp;
  dino.squash += dino.squashVel;

  let targetLean = 0;
  if (dino.jumping) {
    targetLean = dino.vy < 0 ? -0.08 : 0.1;
  } else if (state.gameState === 'running' && !dino.ducking) {
    targetLean = 0.05 + Math.sin(dino.runCycle) * 0.02;
  }
  dino.lean += (targetLean - dino.lean) * 0.15;

  const bob = (!dino.jumping && !dino.ducking && state.gameState === 'running')
    ? Math.abs(Math.sin(dino.runCycle)) * 1.2 : 0;

  const legSin = Math.sin(dino.runCycle);
  const legCos = Math.cos(dino.runCycle); // eslint-disable-line no-unused-vars

  if (dino.ducking && !dino.jumping) {
    const dw = 48, dh = 24;
    const dy = GROUND_Y - dh;
    dino.w = dw; dino.h = dh;
    dino.drawY = dy;

    const cx2 = dino.x + 20;
    const cy2 = GROUND_Y;

    ctx.save();
    ctx.translate(cx2, cy2 - 12);
    ctx.rotate(-0.4);
    drawJacket(-9, -12, 18, 22, 'front');
    ctx.restore();

    ctx.fillStyle = COL_SKIN;
    const hipX = cx2 + 5;
    const hipY = cy2 - 6;
    drawLimb(hipX, hipY, 7, 16, -1.2);
    drawLimb(hipX + 2, hipY, 7, 16, -1.35);

    ctx.fillStyle = COL_SHORT;
    ctx.save();
    ctx.translate(hipX + 1, hipY);
    ctx.rotate(-1.25);
    ctx.beginPath();
    ctx.roundRect(-5, -4, 10, 10, 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = COL_SKIN;
    const shoulderLX = cx2 - 8;
    const shoulderLY = cy2 - 20;
    drawLimb(shoulderLX, shoulderLY, 5, 13, 2.6);

    const shoulderRX = cx2 - 4;
    const shoulderRY = cy2 - 14;
    drawLimb(shoulderRX, shoulderRY, 5, 10, 0.8);

    const headX = cx2 - 10;
    const headY = cy2 - 28;
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(-0.3);
    ctx.drawImage(currentHead, -HEAD_SIZE / 2, -HEAD_SIZE / 2, HEAD_SIZE, HEAD_SIZE);
    ctx.restore();

  } else {
    dino.w = 28; dino.h = 72;
    const baseY = dino.y - bob;
    const dy = baseY - dino.h * dino.squash;
    dino.drawY = dy;

    ctx.save();
    const pivotX = dino.x + 14;
    const pivotY = dino.y;
    ctx.translate(pivotX, pivotY);
    ctx.rotate(dino.lean);
    const sx = 1 + (1 - dino.squash) * 0.5;
    ctx.scale(sx, dino.squash);
    ctx.translate(-pivotX, -pivotY);

    const bodyTop = dino.y - dino.h;
    const hipY = bodyTop + HEAD_SIZE + 15;
    const shoulderY = bodyTop + HEAD_SIZE + 3;
    const LEG_LEN = 16;
    const ARM_LEN = 15;
    const SKIN_BACK = '#C99E78';

    if (dino.jumping) {
      const hipLX = dino.x + 8;
      const hipRX = dino.x + 20;
      const shoulderLX = dino.x + 4;
      const shoulderRX = dino.x + 24;

      drawJacket(dino.x + 4, bodyTop + HEAD_SIZE - 8, 20, 23, 'front');

      ctx.fillStyle = COL_SKIN;
      drawLimb(hipLX, hipY, 6, LEG_LEN, 0.35);
      drawLimb(hipRX, hipY, 6, LEG_LEN, 0.25);

      ctx.fillStyle = COL_SHORT;
      ctx.beginPath();
      ctx.roundRect(dino.x + 5, hipY - 2, 18, 9, 3);
      ctx.fill();

      ctx.fillStyle = COL_SKIN;
      drawLimb(shoulderLX, shoulderY, 5, ARM_LEN, 2.5);
      drawLimb(shoulderRX, shoulderY, 5, ARM_LEN, -2.5);
    } else {
      const hipX = dino.x + 14;
      const shoulderX = dino.x + 14;

      const frontLegAngle = legSin * 0.4;
      const backLegAngle = -legSin * 0.4;
      const frontArmAngle = -legSin * 0.55;
      const backArmAngle = legSin * 0.55;

      ctx.fillStyle = SKIN_BACK;
      drawLimb(hipX, hipY, 6, LEG_LEN, backLegAngle);
      drawLimb(shoulderX, shoulderY, 4, ARM_LEN, backArmAngle);

      drawJacket(dino.x + 4, bodyTop + HEAD_SIZE - 8, 20, 23, 'side');

      ctx.fillStyle = COL_SHORT;
      ctx.beginPath();
      ctx.roundRect(dino.x + 5, hipY - 2, 18, 9, 3);
      ctx.fill();

      ctx.fillStyle = COL_SKIN;
      drawLimb(hipX, hipY, 7, LEG_LEN, frontLegAngle);
      drawLimb(shoulderX, shoulderY, 5, ARM_LEN, frontArmAngle);
    }

    const headCx = dino.x + 14;
    const headCy = bodyTop + HEAD_SIZE / 2;
    const headTilt = dino.jumping ? dino.vy * 0.01 : Math.sin(dino.runCycle * 2) * 0.04;
    ctx.save();
    ctx.translate(headCx, headCy);
    ctx.rotate(headTilt);
    ctx.drawImage(currentHead, -HEAD_SIZE / 2, -HEAD_SIZE / 2, HEAD_SIZE, HEAD_SIZE);
    ctx.restore();

    ctx.restore();
  }
}

// === OBSTACLE DRAWING ===

function drawIceSpike(baseX, baseW, height) {
  const ICE = '#7EC8E3';
  const ICE_DARK = '#4A9FC9';
  const ICE_LIGHT = '#C5E7F5';
  const ICE_SHINE = '#FFFFFF';
  const topY = GROUND_Y - height;
  const cxs = baseX + baseW / 2;

  ctx.fillStyle = ICE_DARK;
  ctx.beginPath();
  ctx.moveTo(baseX, GROUND_Y); ctx.lineTo(cxs, topY); ctx.lineTo(baseX + baseW, GROUND_Y);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = ICE;
  ctx.beginPath();
  ctx.moveTo(baseX, GROUND_Y); ctx.lineTo(cxs, topY); ctx.lineTo(cxs, GROUND_Y);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = ICE_LIGHT;
  ctx.beginPath();
  ctx.moveTo(baseX + baseW * 0.15, GROUND_Y); ctx.lineTo(cxs, topY); ctx.lineTo(cxs - baseW * 0.12, GROUND_Y);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = ICE_SHINE; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cxs - 1, topY + 3); ctx.lineTo(cxs - baseW * 0.2, GROUND_Y - 4);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(cxs, GROUND_Y, baseW * 0.6, 3, 0, Math.PI, 0);
  ctx.fill();
}

function drawIceObstacle(ob) {
  if (ob.type === 'small') {
    drawIceSpike(ob.x + 3, 12, 34);
  } else if (ob.type === 'large') {
    drawIceSpike(ob.x + 2, 20, 46);
    const cxs = ob.x + 2 + 10;
    const topY = GROUND_Y - 46;
    ctx.fillStyle = '#FF7F9E';
    ctx.beginPath(); ctx.arc(cxs, topY - 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cxs - 0.5, topY - 3.5, 1, 0, Math.PI * 2); ctx.fill();
  } else if (ob.type === 'double') {
    drawIceSpike(ob.x, 12, 34);
    drawIceSpike(ob.x + 16, 12, 42);
  }
}

function drawBoatHull(x, y, w, h, sail = false) {
  ctx.fillStyle = '#7A4A2A';
  ctx.beginPath();
  ctx.moveTo(x + 2, y + h * 0.35); ctx.lineTo(x + w - 2, y + h * 0.35);
  ctx.lineTo(x + w - 6, y + h); ctx.lineTo(x + 6, y + h); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#A8683A';
  ctx.fillRect(x + 4, y + h * 0.35, w - 8, 3);

  ctx.strokeStyle = '#4C2E18'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.45, y + h * 0.35); ctx.lineTo(x + w * 0.45, y - h * 0.5);
  ctx.stroke();

  if (sail) {
    ctx.fillStyle = '#FFF7E6';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.47, y - h * 0.5); ctx.lineTo(x + w * 0.47, y + h * 0.1);
    ctx.lineTo(x + w * 0.8, y - h * 0.1); ctx.closePath(); ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, GROUND_Y + 1, w * 0.45, 3, 0, Math.PI, 0);
  ctx.fill();
}

function drawBoatObstacle(ob) {
  if (ob.type === 'small') drawBoatHull(ob.x + 1, GROUND_Y - 18, 16, 18, false);
  else if (ob.type === 'large') {
    drawBoatHull(ob.x + 1, GROUND_Y - 24, 24, 24, true);
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath(); ctx.arc(ob.x + 18, GROUND_Y - 26, 3, 0, Math.PI * 2); ctx.fill();
  } else if (ob.type === 'double') {
    drawBoatHull(ob.x, GROUND_Y - 16, 12, 16, false);
    drawBoatHull(ob.x + 15, GROUND_Y - 20, 12, 20, false);
  }
}

function drawHayBale(x, w, h) {
  const y = GROUND_Y - h;
  ctx.fillStyle = '#D8B04A';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
  ctx.fillStyle = '#E8C86A';
  ctx.fillRect(x + 2, y + 2, w - 4, 4);
  ctx.strokeStyle = '#A97B1D'; ctx.lineWidth = 1.2;
  for (let yi = y + 6; yi < y + h - 2; yi += 5) {
    ctx.beginPath(); ctx.moveTo(x + 2, yi); ctx.lineTo(x + w - 2, yi + 1); ctx.stroke();
  }
  ctx.strokeStyle = '#8C5C14';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.33, y + 2); ctx.lineTo(x + w * 0.33, y + h - 2);
  ctx.moveTo(x + w * 0.66, y + 2); ctx.lineTo(x + w * 0.66, y + h - 2);
  ctx.stroke();
}

function drawHayObstacle(ob) {
  if (ob.type === 'small') {
    drawHayBale(ob.x + 2, 14, 34);
  } else if (ob.type === 'large') {
    drawHayBale(ob.x + 2, 22, 46);
    ctx.fillStyle = '#7A5A28';
    ctx.fillRect(ob.x + 12, GROUND_Y - 46 - 8, 2, 8);
    ctx.fillStyle = '#3F8C3A';
    ctx.beginPath();
    ctx.moveTo(ob.x + 13, GROUND_Y - 54); ctx.lineTo(ob.x + 18, GROUND_Y - 50);
    ctx.lineTo(ob.x + 13, GROUND_Y - 47); ctx.closePath(); ctx.fill();
  } else if (ob.type === 'double') {
    drawHayBale(ob.x, 12, 34);
    drawHayBale(ob.x + 16, 12, 42);
  }
}

function drawVolcanicRock(x, w, h, glowing = false) {
  const y = GROUND_Y - h;
  ctx.fillStyle = '#5A3327';
  ctx.beginPath();
  ctx.moveTo(x + 2, GROUND_Y); ctx.lineTo(x + w * 0.2, y + h * 0.25);
  ctx.lineTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.75, y + h * 0.18);
  ctx.lineTo(x + w - 2, y + h * 0.5); ctx.lineTo(x + w - 4, GROUND_Y);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#7A4735';
  ctx.beginPath();
  ctx.moveTo(x + 4, GROUND_Y - 2); ctx.lineTo(x + w * 0.22, y + h * 0.35);
  ctx.lineTo(x + w * 0.43, y + 4); ctx.lineTo(x + w * 0.58, y + h * 0.16);
  ctx.lineTo(x + w * 0.4, GROUND_Y - 3); ctx.closePath(); ctx.fill();

  if (glowing) {
    ctx.strokeStyle = 'rgba(255, 110, 40, 0.7)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.55, y + h * 0.1); ctx.lineTo(x + w * 0.68, y + h * 0.45);
    ctx.lineTo(x + w * 0.78, y + h * 0.75); ctx.stroke();
  }
}

function drawVolcanoObstacle(ob) {
  if (ob.type === 'small') drawVolcanicRock(ob.x + 1, 16, 34, false);
  else if (ob.type === 'large') drawVolcanicRock(ob.x + 1, 24, 46, true);
  else if (ob.type === 'double') {
    drawVolcanicRock(ob.x, 12, 34, false);
    drawVolcanicRock(ob.x + 16, 12, 42, true);
  }
}

function drawBarrier(x, w, h, withLight = false) {
  const y = GROUND_Y - h;
  ctx.fillStyle = '#34495E';
  ctx.beginPath(); ctx.roundRect(x, y + h * 0.2, w, h * 0.8, 3); ctx.fill();
  ctx.fillStyle = '#F39C12';
  ctx.fillRect(x + 2, y + h * 0.35, w - 4, 4);
  ctx.fillRect(x + 2, y + h * 0.58, w - 4, 4);
  ctx.fillStyle = '#22313F';
  ctx.fillRect(x + 2, GROUND_Y - 6, 4, 6);
  ctx.fillRect(x + w - 6, GROUND_Y - 6, 4, 6);
  if (withLight) {
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath(); ctx.arc(x + w / 2, y + 6, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCityObstacle(ob) {
  if (ob.type === 'small') drawBarrier(ob.x + 2, 14, 34, false);
  else if (ob.type === 'large') drawBarrier(ob.x + 2, 22, 46, true);
  else if (ob.type === 'double') {
    drawBarrier(ob.x, 12, 34, false);
    drawBarrier(ob.x + 16, 12, 42, false);
  }
}

function drawBrickStack(x, w, h) {
  const BRICK = '#B8563A';
  const BRICK_DARK = '#8A3E27';
  const MORTAR = '#E3CCA0';
  const brickH = 7;

  ctx.fillStyle = MORTAR;
  ctx.fillRect(x, GROUND_Y - h, w, h);

  ctx.fillStyle = BRICK;
  const rows = Math.ceil(h / brickH);
  for (let row = 0; row < rows; row++) {
    const yTop = GROUND_Y - (row + 1) * brickH + 1;
    const stagger = row % 2 === 0 ? 0 : w / 2;
    for (let i = -1; i <= 1; i++) {
      const bx = x + i * w + stagger;
      const clipX = Math.max(bx, x);
      const clipR = Math.min(bx + w, x + w);
      if (clipR - clipX > 0) ctx.fillRect(clipX + 0.5, yTop + 0.5, clipR - clipX - 1, brickH - 1.5);
    }
  }

  ctx.fillStyle = BRICK_DARK;
  ctx.fillRect(x, GROUND_Y - h, w, 1.5);
  ctx.fillStyle = 'rgba(255, 220, 180, 0.25)';
  ctx.fillRect(x, GROUND_Y - h + 1, 1, h - 1);
}

function drawBrickObstacle(ob) {
  if (ob.type === 'small') {
    drawBrickStack(ob.x + 2, 14, 34);
  } else if (ob.type === 'large') {
    drawBrickStack(ob.x + 2, 22, 46);
    const x = ob.x + 2 + 11;
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(x, GROUND_Y - 46 - 6, 1, 6);
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(x + 1, GROUND_Y - 46 - 6, 5, 3);
  } else if (ob.type === 'double') {
    drawBrickStack(ob.x, 12, 34);
    drawBrickStack(ob.x + 16, 12, 42);
  }
}

function drawObstacleForTheme(themeName, ob) {
  if (themeName === 'larochelle') drawBoatObstacle(ob);
  else if (themeName === 'vendee') drawHayObstacle(ob);
  else if (themeName === 'auvergne') drawVolcanoObstacle(ob);
  else if (themeName === 'lyon') drawCityObstacle(ob);
  else if (themeName === 'alps') drawIceObstacle(ob);
  else drawBrickObstacle(ob);
}

function drawObstacleContrastBackdrop(ob, themeName, airborne = false) {
  if (state.isIOSDevice) return;
  const cxb = ob.x + ob.w / 2;
  const cyb = airborne ? ob.y + ob.h / 2 : GROUND_Y - ob.h * 0.45;
  const radius = Math.max(ob.w * 1.6, ob.h * 0.9, 18);
  const useLightGlow = themeName === 'lyon';

  ctx.save();
  const grad = ctx.createRadialGradient(cxb, cyb, 2, cxb, cyb, radius);
  if (useLightGlow) {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.06)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.07)');
  }
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(cxb - radius, cyb - radius, radius * 2, radius * 2);

  if (!airborne) {
    ctx.fillStyle = useLightGlow ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(cxb, GROUND_Y + 1, Math.max(ob.w * 0.8, 10), 4, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
}

function drawObstacleWithContrast(themeName, renderFn) {
  if (state.isIOSDevice) { renderFn(); return; }
  ctx.save();
  if (themeName === 'lyon') {
    ctx.shadowColor = 'rgba(255, 255, 255, 0.32)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  renderFn();
  ctx.restore();
}

function drawFlyingMariachi(ob) {
  const cxm = ob.x + ob.w / 2;
  const bottomY = ob.y + ob.h;
  const bob = Math.sin(state.frame * 0.15) * 1.5;
  const wingFlap = Math.sin(state.frame * 0.45);
  const tilt = Math.sin(state.frame * 0.15) * 0.05;

  ctx.save();
  ctx.translate(cxm, bottomY - 4 + bob);
  ctx.rotate(tilt);

  ctx.fillStyle = '#C0392B';
  ctx.beginPath();
  ctx.moveTo(-ob.w / 2 + 2, 0); ctx.lineTo(ob.w / 2 - 2, 0);
  ctx.lineTo(4, -14); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#F1C40F';
  ctx.fillRect(-ob.w / 2 + 3, -4, ob.w - 6, 1.5);
  ctx.fillRect(-ob.w / 2 + 3, -1, ob.w - 6, 1.5);

  ctx.fillStyle = '#D9A87A';
  ctx.beginPath(); ctx.arc(0, -18, 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(-2, -19, 0.9, 0, Math.PI * 2);
  ctx.arc(2, -19, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2B1810'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, -15); ctx.quadraticCurveTo(-2, -13.5, 0, -15);
  ctx.quadraticCurveTo(2, -13.5, 4, -15); ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = '#6B3410';
  ctx.beginPath(); ctx.ellipse(0, -26, 5, 4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#8B4513';
  ctx.beginPath(); ctx.ellipse(0, -23, 13, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#F1C40F';
  ctx.fillRect(-4, -24, 8, 1);
  ctx.beginPath();
  ctx.arc(-12, -22, 1, 0, Math.PI * 2);
  ctx.arc(12, -22, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F5F5F5';
  ctx.save();
  ctx.translate(-ob.w / 2 + 2, -6); ctx.rotate(-wingFlap * 0.5);
  ctx.beginPath(); ctx.ellipse(-2, 0, 5, 2.5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(ob.w / 2 - 2, -6); ctx.rotate(wingFlap * 0.5);
  ctx.beginPath(); ctx.ellipse(2, 0, 5, 2.5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawDoor(ob) {
  const x = ob.x;
  const w = ob.w;
  const fullH = GROUND_Y;
  const centerX = x + w / 2;

  const dist = Math.abs(centerX - dino.x);
  const openRange = 200;
  let raw = 1 - Math.min(dist / openRange, 1);
  if (ob.triggered) raw = 1;
  const progress = raw * raw * (3 - 2 * raw);

  const isMariDoor = ob.isMariachi && !state.mariachiActive;
  const nextThemeIndex = state.mariachiActive
    ? THEMES.indexOf(state.mariachiReturnTheme)
    : Math.min(state.themeIndex + 1, THEMES.length - 1);
  const nextIsDesert = isMariDoor || (nextThemeIndex >= 2);
  const innerCore = '#FFFFFF';
  const innerGlow = nextIsDesert ? '#FF7A2A' : '#5FC0E8';
  const frameAccent = nextIsDesert ? '#FFB347' : '#A8E4FF';
  const emberR = nextIsDesert ? 255 : 180;
  const emberG = nextIsDesert ? 130 : 220;
  const emberB = nextIsDesert ? 40 : 255;

  const pulse = 0.75 + Math.sin(state.frame * 0.18) * 0.2;
  const grad = ctx.createRadialGradient(centerX, fullH / 2, 2, centerX, fullH / 2, w + progress * 40);
  grad.addColorStop(0, innerCore);
  grad.addColorStop(0.25, innerGlow);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = (0.45 + progress * 0.5) * pulse;
  ctx.fillStyle = grad;
  ctx.fillRect(x - 60, 0, w + 120, fullH);
  ctx.globalAlpha = 1;

  const pillarW = 10;
  const stoneGrad = ctx.createLinearGradient(0, 0, 0, fullH);
  stoneGrad.addColorStop(0, '#3A2520');
  stoneGrad.addColorStop(0.5, '#251612');
  stoneGrad.addColorStop(1, '#120906');
  ctx.fillStyle = stoneGrad;
  ctx.fillRect(x - pillarW, 0, pillarW, fullH);
  ctx.fillRect(x + w, 0, pillarW, fullH);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; ctx.lineWidth = 1;
  for (let yi = 25; yi < fullH; yi += 28) {
    ctx.beginPath();
    ctx.moveTo(x - pillarW, yi); ctx.lineTo(x, yi);
    ctx.moveTo(x + w, yi); ctx.lineTo(x + w + pillarW, yi);
    ctx.stroke();
  }

  ctx.fillStyle = frameAccent;
  ctx.fillRect(x - pillarW - 2, 0, pillarW + 4, 4);
  ctx.fillRect(x + w - 2, 0, pillarW + 4, 4);
  ctx.fillStyle = '#1A0D0A';
  ctx.fillRect(x - pillarW - 2, 4, pillarW + 4, 3);
  ctx.fillRect(x + w - 2, 4, pillarW + 4, 3);

  ctx.fillStyle = stoneGrad;
  ctx.beginPath();
  ctx.moveTo(x - pillarW - 2, 0); ctx.lineTo(x + w + pillarW + 2, 0);
  ctx.lineTo(x + w + pillarW + 2, 8);
  ctx.quadraticCurveTo(centerX, 22, x - pillarW - 2, 8);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = frameAccent;
  ctx.beginPath();
  ctx.moveTo(centerX - 5, 4); ctx.lineTo(centerX + 5, 4);
  ctx.lineTo(centerX + 3, 14); ctx.lineTo(centerX - 3, 14);
  ctx.closePath(); ctx.fill();

  const panelW = (w - 2) / 2;
  const leftX = x + 1;
  const rightEdge = x + w - 1;
  const scaleX = 1 - progress * 0.94;

  const doorGrad = ctx.createLinearGradient(0, 0, panelW, 0);
  doorGrad.addColorStop(0, '#4A2518');
  doorGrad.addColorStop(0.5, '#2B1408');
  doorGrad.addColorStop(1, '#180905');

  const drawPanel = (isLeft) => {
    ctx.save();
    if (isLeft) { ctx.translate(leftX, 0); ctx.scale(scaleX, 1); }
    else { ctx.translate(rightEdge, 0); ctx.scale(-scaleX, 1); }
    ctx.fillStyle = doorGrad;
    ctx.fillRect(0, 0, panelW, fullH);
    ctx.fillStyle = '#6B4815';
    ctx.fillRect(0, 30, panelW, 3);
    ctx.fillRect(0, fullH - 55, panelW, 3);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'; ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const lx = (panelW / 3) * i;
      ctx.beginPath(); ctx.moveTo(lx, 6); ctx.lineTo(lx, fullH - 4); ctx.stroke();
    }
    ctx.fillStyle = '#8B6914';
    [25, 90, 150, 190].forEach(cy2 => {
      ctx.beginPath();
      ctx.arc(4, cy2, 1.2, 0, Math.PI * 2);
      ctx.arc(panelW - 10, cy2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#1A0D08';
    ctx.beginPath(); ctx.arc(panelW - 5, fullH / 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#C9A35C'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(panelW - 5, fullH / 2, 3.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };

  drawPanel(true);
  drawPanel(false);

  if (progress > 0.08) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const seed = i * 13.7;
      const cycle = 70;
      const t = ((state.frame + seed) % cycle) / cycle;
      const horizOffset = Math.sin(seed + t * 3) * w * 0.3;
      const sx = centerX + horizOffset;
      const sy = fullH - 10 - t * (fullH - 30);
      const size = Math.max(0, (1 - t) * 2.6 * progress);
      const alpha = (1 - t) * progress * 0.95;
      if (size > 0.3) {
        ctx.fillStyle = `rgba(${emberR}, ${Math.floor(emberG + t * 40)}, ${emberB}, ${alpha.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

function drawBird(ob) {
  const BLACK = '#1C1C1C';
  const WHITE = '#FFFFFF';
  const ORANGE = '#FF8C00';
  const ORANGE_D = '#D46E00';

  const cxb = ob.x + ob.w / 2;
  const bottomY = ob.y + ob.h;
  const bob = Math.sin(state.frame * 0.15) * 1.5;
  const tilt = Math.sin(state.frame * 0.15) * 0.08;
  const flipperFlap = Math.sin(state.frame * 0.3) * 0.6;

  ctx.save();
  ctx.translate(cxb, bottomY - 4 + bob);
  ctx.rotate(tilt);

  ctx.fillStyle = ORANGE;
  ctx.beginPath(); ctx.ellipse(-4, 3, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, 3, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  const bodyH = ob.h - 6;
  ctx.fillStyle = BLACK;
  ctx.beginPath(); ctx.ellipse(0, -bodyH / 2 + 2, ob.w / 2 - 2, bodyH / 2, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.beginPath(); ctx.ellipse(0, -bodyH / 2 + 3, ob.w / 2 - 5, bodyH / 2 - 3, 0, 0, Math.PI * 2); ctx.fill();

  const headY = -bodyH + 1;
  const headR = ob.w / 2 - 1;
  ctx.fillStyle = BLACK;
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.moveTo(-headR + 2, headY); ctx.lineTo(-headR - 4, headY - 1);
  ctx.lineTo(-headR - 4, headY + 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ORANGE_D;
  ctx.beginPath();
  ctx.moveTo(-headR + 2, headY + 1); ctx.lineTo(-headR - 4, headY + 2);
  ctx.lineTo(-headR - 2, headY + 2); ctx.closePath(); ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(-3, headY - 1, 2.8, 0, Math.PI * 2);
  ctx.arc(3, headY - 1, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BLACK;
  ctx.beginPath();
  ctx.arc(-3, headY - 1, 1.5, 0, Math.PI * 2);
  ctx.arc(3, headY - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(-2.5, headY - 1.5, 0.6, 0, Math.PI * 2);
  ctx.arc(3.5, headY - 1.5, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = BLACK;
  ctx.save();
  ctx.translate(-ob.w / 2 + 3, -bodyH / 2); ctx.rotate(flipperFlap);
  ctx.beginPath(); ctx.ellipse(0, 2, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(ob.w / 2 - 3, -bodyH / 2); ctx.rotate(-flipperFlap);
  ctx.beginPath(); ctx.ellipse(0, 2, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore();
}

// === GROUND ===

export function drawGround() {
  const isWarm = WARM_THEMES.includes(state.currentTheme);

  if (isWarm) {
    const grd = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    if (state.currentTheme === 'lyon') {
      grd.addColorStop(0, '#2A3A50'); grd.addColorStop(1, '#151E2A');
    } else {
      grd.addColorStop(0, '#F5D4A3'); grd.addColorStop(1, '#C08548');
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.strokeStyle = state.currentTheme === 'lyon' ? '#3A5A7A' : '#A6723E';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();

    if (!state.isIOSDevice) {
      if (state.currentTheme !== 'lyon') {
        for (let i = 0; i < W + 20; i += 3) {
          const xp = (i - state.groundOffset % 20);
          if (Math.sin(xp * 0.5) > 0.7) { ctx.fillStyle = '#8C5A2E'; ctx.fillRect(xp, GROUND_Y + 4 + (xp % 5), 2, 1); }
        }
        ctx.strokeStyle = 'rgba(140, 90, 46, 0.35)'; ctx.lineWidth = 1;
        for (let i = 0; i < W + 60; i += 60) {
          const xp = ((i - state.groundOffset * 0.8) % (W + 60)); if (xp < 0) continue;
          ctx.beginPath(); ctx.moveTo(xp, GROUND_Y + 8); ctx.quadraticCurveTo(xp + 15, GROUND_Y + 5, xp + 30, GROUND_Y + 8); ctx.stroke();
        }
        ctx.fillStyle = '#E8BC7E';
        for (let i = 0; i < W + 50; i += 50) {
          const xp = ((i - state.groundOffset * 0.8) % (W + 50)); if (xp < 0) continue;
          ctx.beginPath(); ctx.arc(xp, GROUND_Y, 4, Math.PI, 0); ctx.fill();
        }
      }
    }
  } else {
    const grd = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    if (state.currentTheme === 'larochelle') {
      grd.addColorStop(0, '#8A9EA8'); grd.addColorStop(1, '#5A7080');
    } else if (state.currentTheme === 'vendee') {
      grd.addColorStop(0, '#8AC070'); grd.addColorStop(1, '#5A9040');
    } else {
      grd.addColorStop(0, '#F5FBFF'); grd.addColorStop(1, '#B8D4E8');
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.strokeStyle = state.currentTheme === 'vendee' ? '#5A9040' : '#7FB0D4';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();

    if (!state.isIOSDevice) {
      for (let i = 0; i < W + 20; i += 3) {
        const xp = (i - state.groundOffset % 20);
        if (Math.sin(xp * 0.5) > 0.7) {
          ctx.fillStyle = state.currentTheme === 'vendee' ? '#4A7830' : '#A8C8DE';
          ctx.fillRect(xp, GROUND_Y + 4 + (xp % 5), 2, 1);
        }
      }
    }

    if (state.currentTheme === 'alps' && !state.isIOSDevice) {
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < W + 40; i += 40) {
        const xp = ((i - state.groundOffset * 0.8) % (W + 40)); if (xp < 0) continue;
        ctx.beginPath(); ctx.arc(xp, GROUND_Y, 3, Math.PI, 0); ctx.fill();
      }
    }
  }
}

export function drawSnow() {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  state.snowflakes.forEach(f => {
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
  });
}

export function drawClouds() {
  state.clouds.forEach(c => {
    const s = c.scale || 1;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(s, s);

    if (!state.isIOSDevice) {
      ctx.fillStyle = 'rgba(90, 140, 190, 0.12)';
      ctx.beginPath();
      ctx.ellipse(22, 14, 28, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(10, 10, 10, 0, Math.PI * 2);
    ctx.arc(22, 6, 13, 0, Math.PI * 2);
    ctx.arc(36, 9, 10, 0, Math.PI * 2);
    ctx.arc(28, 13, 11, 0, Math.PI * 2);
    ctx.arc(16, 13, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = state.isIOSDevice ? 'rgba(225, 240, 255, 0.3)' : 'rgba(225, 240, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(20, 3, 7, 0, Math.PI * 2);
    ctx.arc(12, 7, 5, 0, Math.PI * 2);
    ctx.fill();

    if (!state.isIOSDevice) {
      ctx.fillStyle = 'rgba(150, 185, 215, 0.3)';
      ctx.beginPath();
      ctx.arc(28, 16, 9, 0, Math.PI);
      ctx.arc(16, 16, 7, 0, Math.PI);
      ctx.fill();
    }

    ctx.restore();
  });
}

// === SWISS FLAG ===

function drawSwissFlag(peakX, peakY) {
  const poleTop = peakY - 18;
  ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(peakX, peakY); ctx.lineTo(peakX, poleTop); ctx.stroke();

  const wave = Math.sin(state.frame * 0.08 + peakX * 0.1) * 0.5;
  const fw = 10, fh = 8;
  const flagX = peakX + 1;
  const flagY = poleTop;

  ctx.fillStyle = '#DA291C';
  ctx.beginPath();
  ctx.moveTo(flagX, flagY); ctx.lineTo(flagX + fw, flagY + wave);
  ctx.lineTo(flagX + fw, flagY + fh + wave); ctx.lineTo(flagX, flagY + fh);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(flagX + 1, flagY + fh / 2 - 1, fw - 3, 1.5);
  ctx.fillRect(flagX + fw / 2 - 1, flagY + 1.5, 1.5, fh - 3);
}

// === BACKGROUND THEMES ===

function drawBgLaRochelle() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#4A90C8'); sky.addColorStop(0.6, '#9AC8EA'); sky.addColorStop(1, '#D0E8F5');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y);

  ctx.fillStyle = 'rgba(255,230,120,0.6)';
  ctx.beginPath(); ctx.arc(W - 80, 45, 36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,245,180,0.9)';
  ctx.beginPath(); ctx.arc(W - 80, 45, 20, 0, Math.PI * 2); ctx.fill();

  const sea = ctx.createLinearGradient(0, GROUND_Y - 50, 0, GROUND_Y);
  sea.addColorStop(0, '#3A7DB0'); sea.addColorStop(1, '#1A5C8A');
  ctx.fillStyle = sea;
  ctx.fillRect(0, GROUND_Y - 50, W, 50);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 60) {
    const xw = (i - state.groundOffset * 0.3) % (W + 60);
    ctx.beginPath(); ctx.moveTo(xw, GROUND_Y - 30); ctx.lineTo(xw + 18, GROUND_Y - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xw + 10, GROUND_Y - 20); ctx.lineTo(xw + 26, GROUND_Y - 20); ctx.stroke();
  }

  function drawTour(bx, h, w) {
    ctx.fillStyle = '#8A7A6A';
    ctx.fillRect(bx, GROUND_Y - h, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let yi = 12; yi < h; yi += 12) {
      ctx.beginPath(); ctx.moveTo(bx, GROUND_Y - yi); ctx.lineTo(bx + w, GROUND_Y - yi); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(bx, GROUND_Y - h, 4, h);
    ctx.fillStyle = '#9A8A7A';
    const mw = 6, mg = 5;
    for (let mx = bx; mx < bx + w; mx += mw + mg) { ctx.fillRect(mx, GROUND_Y - h - 10, mw, 10); }
    ctx.fillStyle = '#3A2E26';
    ctx.beginPath(); ctx.roundRect(bx + w / 2 - 5, GROUND_Y - 28, 10, 28, [5, 5, 0, 0]); ctx.fill();
    ctx.fillStyle = '#1A2A3A';
    ctx.beginPath();
    ctx.arc(bx + w / 2, GROUND_Y - h + 22, 4, Math.PI, 0);
    ctx.fillRect(bx + w / 2 - 4, GROUND_Y - h + 22, 8, 6); ctx.fill();
    ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx + w / 2, GROUND_Y - h - 10); ctx.lineTo(bx + w / 2, GROUND_Y - h - 26); ctx.stroke();
    ctx.fillStyle = '#DA291C';
    ctx.fillRect(bx + w / 2, GROUND_Y - h - 26, 12, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx + w / 2 + 2, GROUND_Y - h - 26, 8, 3);
    ctx.fillRect(bx + w / 2 + 5, GROUND_Y - h - 26, 3, 8);
  }

  ctx.fillStyle = '#9A8A76';
  ctx.fillRect(0, GROUND_Y - 52, W, 4);

  const tOff = (state.groundOffset * 0.15) % 520;
  drawTour(220 - tOff, 110, 38);
  drawTour(290 - tOff, 100, 32);
  drawTour(220 - tOff + 520, 110, 38);
  drawTour(290 - tOff + 520, 100, 32);

  const bx2 = ((550 - state.groundOffset * 0.25) % (W + 160)) - 60;
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.moveTo(bx2 + 18, GROUND_Y - 60); ctx.lineTo(bx2 + 18, GROUND_Y - 90); ctx.lineTo(bx2 + 40, GROUND_Y - 60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#D44';
  ctx.beginPath();
  ctx.moveTo(bx2 + 20, GROUND_Y - 60); ctx.lineTo(bx2 + 20, GROUND_Y - 80); ctx.lineTo(bx2 + 5, GROUND_Y - 60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8A7060';
  ctx.beginPath(); ctx.ellipse(bx2 + 20, GROUND_Y - 52, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
}

function drawBgVendee() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#7FBDE0'); sky.addColorStop(0.5, '#B8D8EE'); sky.addColorStop(1, '#DCF0F8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const cOff = (state.groundOffset * 0.18) % (W + 100);
  [[80, 35], [260, 28], [480, 40], [650, 32]].forEach(([cxc, cyc]) => {
    const px = cxc - cOff;
    ctx.beginPath(); ctx.arc(px, cyc, 14, 0, Math.PI * 2); ctx.arc(px + 14, cyc - 4, 18, 0, Math.PI * 2); ctx.arc(px + 30, cyc, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 820, cyc + 5, 14, 0, Math.PI * 2); ctx.arc(px + 834, cyc, 18, 0, Math.PI * 2); ctx.arc(px + 850, cyc + 5, 13, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = 'rgba(100, 160, 80, 0.4)';
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= W; x += 30) {
    const y = GROUND_Y - 30 - Math.sin((x + state.groundOffset * 0.1) * 0.015) * 25;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, GROUND_Y); ctx.closePath(); ctx.fill();

  function drawMoulin(mx) {
    const base = GROUND_Y - 8;
    ctx.fillStyle = '#C8B89A';
    ctx.beginPath();
    ctx.moveTo(mx - 10, base); ctx.lineTo(mx - 6, base - 60); ctx.lineTo(mx + 6, base - 60); ctx.lineTo(mx + 10, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#A08870';
    ctx.beginPath(); ctx.ellipse(mx, base - 60, 8, 5, 0, Math.PI, 0); ctx.fill();
    const angle = (state.frame * 0.015 + mx * 0.03);
    ctx.strokeStyle = '#7A6050'; ctx.lineWidth = 2;
    for (let b = 0; b < 4; b++) {
      const a = angle + b * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(mx, base - 62); ctx.lineTo(mx + Math.cos(a) * 22, base - 62 + Math.sin(a) * 22); ctx.stroke();
      ctx.fillStyle = '#D4C8B0';
      ctx.beginPath();
      ctx.moveTo(mx, base - 62); ctx.lineTo(mx + Math.cos(a) * 22, base - 62 + Math.sin(a) * 22);
      ctx.lineTo(mx + Math.cos(a + 0.2) * 20, base - 62 + Math.sin(a + 0.2) * 20); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#4A3828';
    ctx.beginPath(); ctx.roundRect(mx - 4, base - 18, 8, 18, [4, 4, 0, 0]); ctx.fill();
  }

  const mOff = (state.groundOffset * 0.2) % 400;
  drawMoulin(150 - mOff); drawMoulin(380 - mOff);
  drawMoulin(150 - mOff + 400); drawMoulin(380 - mOff + 400);

  ctx.fillStyle = 'rgba(60, 110, 50, 0.5)';
  for (let i = 0; i < W + 100; i += 120) {
    const hx = (i - state.groundOffset * 0.15) % (W + 120);
    ctx.fillRect(hx, GROUND_Y - 40, 8, 40);
    ctx.beginPath(); ctx.arc(hx + 4, GROUND_Y - 42, 8, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBgAuvergne() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#8B5E3C'); sky.addColorStop(0.5, '#C4835A'); sky.addColorStop(1, '#E8B990');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y);

  ctx.fillStyle = 'rgba(255,180,60,0.35)';
  ctx.beginPath(); ctx.arc(W / 2, 60, 50, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,100,0.6)';
  ctx.beginPath(); ctx.arc(W / 2, 60, 28, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(180,140,100,0.25)';
  for (let i = 0; i < 4; i++) {
    const cxa = ((i * 190 + state.frame * 0.3) % (W + 80)) - 40;
    const cya = 30 + Math.sin(state.frame * 0.02 + i) * 8;
    ctx.beginPath(); ctx.arc(cxa, cya, 18 + i * 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawPuy(px, ph, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(px - ph * 0.8, GROUND_Y); ctx.lineTo(px, GROUND_Y - ph); ctx.lineTo(px + ph * 0.8, GROUND_Y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(80,30,10,0.6)';
    ctx.beginPath(); ctx.arc(px, GROUND_Y - ph + 4, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,80,0,0.3)';
    ctx.beginPath(); ctx.arc(px, GROUND_Y - ph + 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,100,0,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 4, GROUND_Y - ph + 8); ctx.quadraticCurveTo(px + 14, GROUND_Y - ph / 2, px + 20, GROUND_Y);
    ctx.stroke();
  }

  const vOff = (state.groundOffset * 0.12) % 450;
  drawPuy(120 - vOff, 100, '#6B3A28'); drawPuy(310 - vOff, 130, '#8A4A30'); drawPuy(500 - vOff, 90, '#7A3E26');
  drawPuy(120 - vOff + 450, 100, '#6B3A28'); drawPuy(310 - vOff + 450, 130, '#8A4A30');
}

function drawBgLyon() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#2C3E6A'); sky.addColorStop(0.5, '#4A6490'); sky.addColorStop(1, '#8AADCC');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y);

  if (!state.isIOSDevice) {
    ctx.fillStyle = 'rgba(255,200,80,0.08)';
    ctx.fillRect(0, GROUND_Y - 100, W, 100);
  }

  const fOff = (state.groundOffset * 0.08) % (W + 300);
  function drawFourviere(fx) {
    ctx.fillStyle = 'rgba(100,80,60,0.7)';
    ctx.beginPath(); ctx.moveTo(fx - 80, GROUND_Y); ctx.quadraticCurveTo(fx, GROUND_Y - 80, fx + 80, GROUND_Y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,170,0.8)';
    ctx.fillRect(fx - 18, GROUND_Y - 130, 10, 55);
    ctx.fillRect(fx + 8, GROUND_Y - 140, 12, 65);
    ctx.beginPath(); ctx.moveTo(fx - 18, GROUND_Y - 130); ctx.lineTo(fx - 13, GROUND_Y - 150); ctx.lineTo(fx - 8, GROUND_Y - 130); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx + 8, GROUND_Y - 140); ctx.lineTo(fx + 14, GROUND_Y - 165); ctx.lineTo(fx + 20, GROUND_Y - 140); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,80,0.5)';
    ctx.beginPath(); ctx.arc(fx + 2, GROUND_Y - 110, 5, 0, Math.PI * 2); ctx.fill();
  }
  drawFourviere(300 - fOff);
  drawFourviere(300 - fOff + W + 300);

  const bOff = (state.groundOffset * 0.3) % (W + 400);
  const buildings = [
    [0, 80, 35], [45, 60, 28], [80, 90, 22], [110, 50, 30], [150, 75, 25],
    [185, 65, 20], [210, 85, 30], [250, 55, 22], [280, 70, 28], [318, 95, 18],
    [345, 60, 24], [378, 80, 26], [415, 50, 20], [445, 72, 30], [485, 88, 22],
  ];
  buildings.forEach(([bx, bh, bw]) => {
    const rx = bx - bOff;
    ctx.fillStyle = '#2A3A5A';
    ctx.fillRect(rx, GROUND_Y - bh, bw, bh);
    if (!state.isIOSDevice) {
      ctx.fillStyle = 'rgba(255,220,100,0.7)';
      for (let wy = GROUND_Y - bh + 6; wy < GROUND_Y - 6; wy += 12) {
        for (let wx = rx + 4; wx < rx + bw - 4; wx += 8) {
          if ((wx + wy + state.frame) % 7 !== 0) ctx.fillRect(wx, wy, 4, 5);
        }
      }
    }
    ctx.fillStyle = '#2A3A5A';
    ctx.fillRect(rx + W + 400, GROUND_Y - bh, bw, bh);
    if (!state.isIOSDevice) {
      ctx.fillStyle = 'rgba(255,220,100,0.7)';
      for (let wy = GROUND_Y - bh + 6; wy < GROUND_Y - 6; wy += 12) {
        for (let wx = rx + W + 404; wx < rx + W + 400 + bw - 4; wx += 8) {
          if ((wx + wy + state.frame) % 7 !== 0) ctx.fillRect(wx, wy, 4, 5);
        }
      }
    }
  });

  const river = ctx.createLinearGradient(0, GROUND_Y - 45, 0, GROUND_Y);
  river.addColorStop(0, '#1A3A5C'); river.addColorStop(1, '#0A2040');
  ctx.fillStyle = river;
  ctx.fillRect(0, GROUND_Y - 45, W, 45);
  if (!state.isIOSDevice) {
    ctx.strokeStyle = 'rgba(255,200,80,0.2)'; ctx.lineWidth = 2;
    for (let i = 0; i < W; i += 70) {
      const rx2 = (i - state.groundOffset * 0.4) % (W + 70);
      ctx.beginPath(); ctx.moveTo(rx2, GROUND_Y - 25); ctx.lineTo(rx2 + 30, GROUND_Y - 22); ctx.stroke();
    }
  }
}

function drawBgAlps() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#BCDCF5'); sky.addColorStop(0.5, '#DEEFFB'); sky.addColorStop(1, '#F4FAFF');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y);

  ctx.fillStyle = 'rgba(220, 240, 255, 0.55)';
  ctx.beginPath(); ctx.arc(W - 110, 55, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(235, 248, 255, 0.85)';
  ctx.beginPath(); ctx.arc(W - 110, 55, 24, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(170, 200, 225, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(60, 150); ctx.lineTo(130, 180); ctx.lineTo(210, 130);
  ctx.lineTo(290, 170); ctx.lineTo(360, 150); ctx.lineTo(440, 185);
  ctx.lineTo(520, 140); ctx.lineTo(610, 175); ctx.lineTo(690, 145);
  ctx.lineTo(770, 180); ctx.lineTo(W, 160); ctx.lineTo(W, GROUND_Y);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(210, 130); ctx.lineTo(225, 145); ctx.lineTo(195, 145); ctx.closePath();
  ctx.moveTo(520, 140); ctx.lineTo(538, 158); ctx.lineTo(505, 158); ctx.closePath();
  ctx.moveTo(690, 145); ctx.lineTo(705, 160); ctx.lineTo(677, 160); ctx.closePath();
  ctx.fill();

  drawSwissFlag(210, 130);
  drawSwissFlag(520, 140);
  drawSwissFlag(690, 145);
}

function drawBgMariachi() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#FFC88A'); sky.addColorStop(0.5, '#FFE0B5'); sky.addColorStop(1, '#FFF2DA');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y);

  ctx.fillStyle = 'rgba(255, 180, 100, 0.55)';
  ctx.beginPath(); ctx.arc(W - 110, 55, 45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255, 200, 120, 0.85)';
  ctx.beginPath(); ctx.arc(W - 110, 55, 28, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(180, 120, 80, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(50, 170); ctx.lineTo(110, 175); ctx.lineTo(140, 155);
  ctx.lineTo(200, 155); ctx.lineTo(230, 180); ctx.lineTo(310, 170);
  ctx.lineTo(360, 150); ctx.lineTo(420, 150); ctx.lineTo(460, 185);
  ctx.lineTo(540, 160); ctx.lineTo(590, 160); ctx.lineTo(630, 180);
  ctx.lineTo(710, 165); ctx.lineTo(760, 165); ctx.lineTo(W, 180);
  ctx.lineTo(W, GROUND_Y); ctx.closePath(); ctx.fill();

  // Cacti silhouettes
  ctx.fillStyle = 'rgba(120, 90, 60, 0.45)';
  [100, 270, 480, 680].forEach(mcx => {
    ctx.fillRect(mcx - 2, GROUND_Y - 22, 4, 22);
    ctx.fillRect(mcx - 6, GROUND_Y - 15, 4, 8);
    ctx.fillRect(mcx + 2, GROUND_Y - 18, 4, 8);
  });

  if (!state.isIOSDevice) {
    const colors = ['#E74C3C', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#E67E22'];
    for (let i = 0; i < 8; i++) {
      const px1 = (i * 110 - state.groundOffset * 0.4) % (W + 110);
      const px2 = px1 + 110;
      const midY = 25 + Math.sin((i + state.frame * 0.02)) * 4;
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px1, 12); ctx.quadraticCurveTo((px1 + px2) / 2, midY, px2, 12); ctx.stroke();
      for (let j = 0; j < 5; j++) {
        const tx = px1 + j * 22 + 5;
        const ty1 = 12 + Math.sin((tx + state.frame * 0.02) * 0.1) * 2;
        ctx.fillStyle = colors[(i + j) % colors.length];
        ctx.beginPath();
        ctx.moveTo(tx, ty1); ctx.lineTo(tx + 10, ty1); ctx.lineTo(tx + 5, ty1 + 14); ctx.closePath(); ctx.fill();
      }
    }
  }
}

// === MAIN DRAW FUNCTION ===

export function draw() {
  ctx.clearRect(0, 0, W, H);

  if (state.currentTheme === 'larochelle') drawBgLaRochelle();
  else if (state.currentTheme === 'vendee') drawBgVendee();
  else if (state.currentTheme === 'auvergne') drawBgAuvergne();
  else if (state.currentTheme === 'lyon') drawBgLyon();
  else if (state.currentTheme === 'alps') drawBgAlps();
  else if (state.currentTheme === 'mariachi') drawBgMariachi();

  drawClouds();
  drawGround();
  if (state.currentTheme === 'alps') drawSnow();

  state.obstacles.forEach(ob => {
    if (ob.isDoor) drawDoor(ob);
    else if (ob.bird) {
      const obstacleTheme = ob.spawnTheme || ob.theme || state.currentTheme;
      drawObstacleContrastBackdrop(ob, obstacleTheme, true);
      drawObstacleWithContrast(obstacleTheme, () => {
        if (obstacleTheme === 'mariachi') drawFlyingMariachi(ob);
        else drawBird(ob);
      });
    } else {
      const obstacleTheme = ob.theme || state.currentTheme;
      drawObstacleContrastBackdrop(ob, obstacleTheme, false);
      drawObstacleWithContrast(obstacleTheme, () => {
        drawObstacleForTheme(obstacleTheme, ob);
      });
    }
  });

  if (state.playerBestScore > 0 && !state.recordLinePassed) {
    const recordLineScreenX = state.recordLineX - state.groundOffset;
    if (recordLineScreenX > 0 && recordLineScreenX < W) {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(recordLineScreenX, 0);
      ctx.lineTo(recordLineScreenX, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (state.beatRecord && state.recordLinePassed) {
    const pulseAlpha = 0.3 + Math.sin(state.frame * 0.15) * 0.5;
    ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha * 0.2})`;
    ctx.fillRect(0, 0, W, H);
    if (state.frame > 60) {
      state.beatRecord = false;
    }
  }

  drawDino();

  if (state.themeFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${state.themeFlash})`;
    ctx.fillRect(0, 0, W, H);
    state.themeFlash -= 0.04;
  }
}

export function animateSnow() {
  state.snowflakes.forEach(f => {
    f.drift += 0.02;
    const scroll = state.gameState === 'running' ? state.speed * 0.15 : 0.3;
    f.x -= scroll + Math.sin(f.drift) * 0.3;
    f.y += f.vy;
    if (f.y > GROUND_Y) { f.y = -2; f.x = Math.random() * W; }
    if (f.x < -5) f.x = W + 5;
  });
}
