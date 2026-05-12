const P = 4;

function texture(scene, key, width, height, draw) {
  const canvasTexture = scene.textures.createCanvas(key, width, height);
  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  canvasTexture.refresh();
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function px(ctx, x, y, w, h, color) {
  rect(ctx, x * P, y * P, w * P, h * P, color);
}

function diamond(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

function poly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function clipPoly(ctx, points, draw) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.clip();
  draw();
  ctx.restore();
}

function roofTiles(ctx, x, y, w, h, color, shadow) {
  for (let yy = y + 5; yy < y + h; yy += 8) {
    rect(ctx, x, yy, w, 2, shadow);
  }
  for (let xx = x + 10; xx < x + w - 4; xx += 18) {
    rect(ctx, xx, y + 4, 2, h - 6, color);
  }
}

function woodPlanks(ctx, x, y, w, h) {
  for (let yy = y + 8; yy < y + h - 2; yy += 12) {
    rect(ctx, x, yy, w, 2, "#b6845f");
  }
  for (let xx = x + 14; xx < x + w - 6; xx += 20) {
    rect(ctx, xx, y + 4, 2, h - 8, "#8e5e46");
  }
}

function grassBlade(ctx, x, y, sway, color, shadow = "#2f763c") {
  rect(ctx, x, y + 8, 2, 3, shadow);
  rect(ctx, x + sway, y + 3, 2, 6, color);
  rect(ctx, x + sway - 1, y + 6, 1, 3, "#438f42");
  rect(ctx, x + sway + 2, y + 5, 1, 4, "#a7df61");
}

function drawGrassTile(ctx, sway) {
  rect(ctx, 0, 0, 32, 32, "#5eae50");

  const patches = [
    [0, 0, 16, 16, "#62b654"], [16, 0, 16, 16, "#58a94d"],
    [0, 16, 16, 16, "#56a44b"], [16, 16, 16, 16, "#65b856"]
  ];
  patches.forEach(([x, y, w, h, color]) => rect(ctx, x, y, w, h, color));

  const darkTufts = [
    [5, 23], [24, 14]
  ];
  darkTufts.forEach(([x, y]) => {
    rect(ctx, x, y, 2, 4, "#3f8b42");
    rect(ctx, x + 2, y + 2, 1, 3, "#377c3d");
  });

  const blades = [
    [4, 4], [15, 8], [27, 5],
    [8, 18], [20, 22], [29, 25]
  ];

  blades.forEach(([x, y], index) => {
    const localSway = index % 2 === 0 ? sway : -sway;
    const color = index % 3 === 0 ? "#9bdc61" : "#7fca55";
    grassBlade(ctx, x, y, localSway, color);
  });

  rect(ctx, 11, 3, 3, 1, "#8bd05a");
  rect(ctx, 3, 15, 2, 1, "#70bd52");
  rect(ctx, 25, 29, 3, 1, "#8fd35b");
}

export function createPixelArtTextures(scene) {
  createTiles(scene);
  createWorldObjects(scene);
  createInteriorObjects(scene);
  createPlayer(scene);
  createDragon(scene);
  createNpc(scene);
  createUi(scene);
}

function createTiles(scene) {
  texture(scene, "tile-grass", 32, 32, (ctx) => drawGrassTile(ctx, 0));
  texture(scene, "tile-grass-0", 32, 32, (ctx) => drawGrassTile(ctx, 0));
  texture(scene, "tile-grass-1", 32, 32, (ctx) => drawGrassTile(ctx, 1));
  texture(scene, "tile-grass-2", 32, 32, (ctx) => drawGrassTile(ctx, -1));

  texture(scene, "tile-path", 32, 32, (ctx) => {
    rect(ctx, 0, 0, 32, 32, "#ad7658");
    px(ctx, 1, 1, 1, 1, "#895948");
    px(ctx, 6, 2, 1, 1, "#c68d65");
    px(ctx, 3, 6, 1, 1, "#805040");
    px(ctx, 5, 5, 1, 1, "#c28762");
  });

  texture(scene, "tile-water-0", 32, 32, (ctx) => {
    rect(ctx, 0, 0, 32, 32, "#4ca3d4");
    rect(ctx, 0, 6, 32, 4, "#5eb6de");
    rect(ctx, 8, 20, 18, 4, "#3c89b7");
  });

  texture(scene, "tile-water-1", 32, 32, (ctx) => {
    rect(ctx, 0, 0, 32, 32, "#4ca3d4");
    rect(ctx, 10, 6, 22, 4, "#5eb6de");
    rect(ctx, 0, 22, 18, 4, "#3c89b7");
  });

  texture(scene, "tile-floor", 32, 32, (ctx) => {
    rect(ctx, 0, 0, 32, 32, "#b9855f");
    rect(ctx, 0, 30, 32, 2, "#9a684e");
    rect(ctx, 30, 0, 2, 32, "#d09a72");
  });

  texture(scene, "tile-wall", 32, 32, (ctx) => {
    rect(ctx, 0, 0, 32, 32, "#d6b387");
    rect(ctx, 0, 24, 32, 8, "#9c6b55");
    rect(ctx, 0, 0, 32, 4, "#8b5547");
    rect(ctx, 0, 14, 32, 2, "#b98b68");
  });

  texture(scene, "tile-rug", 32, 32, (ctx) => {
    rect(ctx, 0, 0, 32, 32, "#8d4250");
    rect(ctx, 4, 4, 24, 24, "#bd6756");
    rect(ctx, 10, 10, 12, 12, "#e1a75c");
  });
}

function createWorldObjects(scene) {
  texture(scene, "tree", 64, 76, (ctx) => {
    rect(ctx, 22, 50, 20, 18, "#674633");
    rect(ctx, 18, 62, 28, 8, "#3b2d28");
    rect(ctx, 8, 26, 48, 34, "#2d783b");
    rect(ctx, 4, 18, 28, 28, "#579d47");
    rect(ctx, 22, 10, 36, 34, "#72b84f");
    rect(ctx, 0, 34, 26, 24, "#66ad4b");
    rect(ctx, 32, 34, 30, 24, "#4d963e");
    rect(ctx, 14, 14, 8, 8, "#8bd064");
    rect(ctx, 39, 18, 8, 8, "#91d36b");
    rect(ctx, 8, 42, 8, 8, "#7bc35a");
  });

  texture(scene, "bush", 42, 32, (ctx) => {
    rect(ctx, 4, 10, 34, 18, "#3e8f42");
    rect(ctx, 0, 14, 14, 12, "#66b855");
    rect(ctx, 12, 4, 18, 20, "#7cca5e");
    rect(ctx, 28, 10, 14, 16, "#559f48");
  });

  texture(scene, "house-main", 176, 144, (ctx) => {
    rect(ctx, 13, 126, 150, 10, "rgba(28, 30, 34, 0.35)");

    rect(ctx, 28, 72, 110, 46, "#d79b52");
    rect(ctx, 112, 72, 26, 46, "#b97845");
    for (let x = 32; x < 135; x += 10) {
      rect(ctx, x, 74, 2, 42, "#aa6f3f");
      rect(ctx, x + 2, 74, 1, 42, "#efbd6e");
    }
    rect(ctx, 28, 72, 110, 4, "#8c5437");
    rect(ctx, 28, 114, 110, 4, "#8c5437");
    rect(ctx, 134, 76, 8, 39, "#7f4d36");

    rect(ctx, 16, 74, 44, 42, "#9b5d38");
    rect(ctx, 16, 114, 44, 6, "#6f432e");
    for (let y = 78; y < 110; y += 8) {
      for (let x = 20; x < 54; x += 9) {
        rect(ctx, x, y, 8, 6, "#7a4b30");
        rect(ctx, x + 1, y + 1, 4, 3, "#c47b40");
        rect(ctx, x + 4, y + 1, 2, 2, "#533223");
      }
    }

    rect(ctx, 18, 63, 45, 13, "#8e2d28");
    poly(ctx, [[14, 63], [40, 48], [67, 63], [61, 76], [40, 64], [20, 76]], "#c54434");
    roofTiles(ctx, 20, 62, 39, 12, "#e45c41", "#7d2b2d");

    rect(ctx, 54, 64, 93, 10, "#692a2e");
    poly(ctx, [[50, 64], [98, 18], [150, 64], [139, 78], [98, 40], [60, 78]], "#a33431");
    poly(ctx, [[61, 62], [98, 25], [139, 62], [98, 42]], "#e44f38");
    poly(ctx, [[98, 25], [139, 62], [130, 73], [98, 42]], "#b73534");
    for (let yy = 37; yy < 72; yy += 8) {
      poly(ctx, [[63, yy], [98, yy - 28], [134, yy], [130, yy + 3], [98, yy - 20], [67, yy + 3]], "#7b2b30");
      poly(ctx, [[66, yy - 1], [98, yy - 26], [130, yy - 1], [98, yy - 20]], "#d94835");
    }
    rect(ctx, 96, 23, 4, 47, "#67252e");
    rect(ctx, 101, 27, 4, 42, "#f07043");
    rect(ctx, 59, 64, 86, 4, "#f17448");

    rect(ctx, 87, 47, 21, 20, "#613b35");
    rect(ctx, 91, 51, 13, 13, "#5aa0c4");
    rect(ctx, 94, 49, 7, 17, "#c9894e");
    rect(ctx, 89, 55, 17, 3, "#2f5970");
    rect(ctx, 96, 49, 3, 17, "#2f5970");
    rect(ctx, 92, 52, 3, 3, "#b9e5e4");

    rect(ctx, 38, 86, 28, 22, "#3b3338");
    rect(ctx, 42, 89, 20, 14, "#74a9bd");
    rect(ctx, 42, 89, 20, 4, "#c8ece7");
    rect(ctx, 50, 89, 3, 14, "#3b3338");
    rect(ctx, 42, 96, 20, 3, "#3b3338");
    rect(ctx, 36, 107, 32, 5, "#77513b");
    rect(ctx, 34, 111, 36, 4, "#4f8e4c");
    rect(ctx, 40, 111, 5, 5, "#f7e381");
    rect(ctx, 55, 111, 5, 5, "#ef7d62");

    rect(ctx, 101, 82, 28, 36, "#704638");
    rect(ctx, 105, 87, 20, 31, "#a66742");
    rect(ctx, 108, 90, 14, 20, "#c5834d");
    rect(ctx, 123, 100, 3, 3, "#f3c36b");
    rect(ctx, 98, 78, 34, 7, "#4f5159");
    rect(ctx, 102, 75, 26, 4, "#8a8581");
    rect(ctx, 103, 120, 24, 5, "#c44732");
    rect(ctx, 99, 125, 32, 5, "#8b3c2d");

    rect(ctx, 28, 118, 110, 9, "#6f432e");
    for (let x = 31; x < 136; x += 12) {
      rect(ctx, x, 118, 2, 9, "#3f2b22");
      rect(ctx, x + 2, 119, 8, 2, "#a8683d");
    }
    rect(ctx, 68, 127, 66, 6, "#8f562f");
    rect(ctx, 73, 133, 54, 5, "#b7743f");
    rect(ctx, 80, 138, 38, 4, "#7d4930");

    rect(ctx, 142, 70, 10, 48, "#8a4e31");
    for (let y = 74; y < 116; y += 8) {
      rect(ctx, 143, y, 8, 3, "#c56f3e");
    }
    rect(ctx, 150, 76, 5, 38, "#5f3928");
  });

  texture(scene, "gable-stone-house", 160, 150, (ctx) => {
    rect(ctx, 39, 135, 82, 7, "rgba(25, 28, 25, 0.32)");
    rect(ctx, 48, 128, 64, 8, "#31443e");

    rect(ctx, 45, 92, 70, 36, "#e0bd73");
    rect(ctx, 50, 96, 60, 4, "#f3d38b");
    rect(ctx, 43, 90, 74, 5, "#332519");
    rect(ctx, 42, 126, 76, 5, "#5d4e3d");
    rect(ctx, 49, 122, 12, 7, "#70838a");
    rect(ctx, 99, 122, 12, 7, "#70838a");
    rect(ctx, 46, 118, 68, 4, "#8b8f86");

    for (let x = 51; x <= 109; x += 12) {
      rect(ctx, x, 96, 2, 27, "#b9884d");
    }
    for (let y = 101; y <= 119; y += 9) {
      rect(ctx, 48, y, 64, 2, "#c99856");
    }

    poly(ctx, [[43, 91], [80, 59], [117, 91], [112, 99], [80, 72], [48, 99]], "#2f2118");
    poly(ctx, [[50, 90], [80, 65], [110, 90], [80, 72]], "#dca956");
    poly(ctx, [[55, 90], [80, 70], [105, 90], [80, 76]], "#f2cd78");
    rect(ctx, 76, 66, 8, 31, "#2a1f18");
    rect(ctx, 79, 68, 3, 28, "#8f5c2f");

    const leftRoof = [[34, 38], [76, 17], [76, 92], [34, 92]];
    const rightRoof = [[84, 17], [126, 38], [126, 92], [84, 92]];
    poly(ctx, [[31, 36], [76, 13], [84, 13], [129, 36], [129, 95], [84, 95], [80, 91], [76, 95], [31, 95]], "#2b2118");
    poly(ctx, leftRoof, "#c4863d");
    poly(ctx, rightRoof, "#ad6f35");

    clipPoly(ctx, leftRoof, () => {
      for (let y = 28; y <= 86; y += 9) {
        rect(ctx, 34, y, 42, 2, "#5d3925");
        rect(ctx, 38, y + 4, 34, 2, "#e1a65a");
      }
      for (let y = 34; y <= 78; y += 18) {
        rect(ctx, 42, y, 16, 2, "#744728");
        rect(ctx, 60, y + 8, 14, 2, "#744728");
      }
    });

    clipPoly(ctx, rightRoof, () => {
      for (let y = 28; y <= 86; y += 9) {
        rect(ctx, 84, y, 42, 2, "#553522");
        rect(ctx, 89, y + 4, 32, 2, "#cc8d49");
      }
      for (let y = 34; y <= 78; y += 18) {
        rect(ctx, 92, y, 16, 2, "#684126");
        rect(ctx, 110, y + 8, 14, 2, "#684126");
      }
    });

    rect(ctx, 76, 14, 8, 84, "#2b2119");
    rect(ctx, 80, 15, 3, 80, "#9b6230");
    rect(ctx, 78, 27, 3, 5, "#181513");
    rect(ctx, 78, 47, 3, 5, "#181513");
    rect(ctx, 78, 67, 3, 5, "#181513");

    rect(ctx, 52, 102, 22, 22, "#5a381e");
    rect(ctx, 57, 107, 12, 12, "#a06a2f");
    rect(ctx, 60, 107, 3, 12, "#2b2118");
    rect(ctx, 57, 112, 12, 3, "#2b2118");
    rect(ctx, 56, 106, 14, 14, "rgba(251, 216, 113, 0.16)");

    rect(ctx, 86, 102, 22, 22, "#5a381e");
    rect(ctx, 91, 107, 12, 12, "#a06a2f");
    rect(ctx, 94, 107, 3, 12, "#2b2118");
    rect(ctx, 91, 112, 12, 3, "#2b2118");
    rect(ctx, 90, 106, 14, 14, "rgba(251, 216, 113, 0.16)");

    rect(ctx, 70, 105, 20, 28, "#5a2f22");
    rect(ctx, 74, 109, 12, 24, "#8f4b2d");
    rect(ctx, 78, 110, 4, 8, "#2b2118");
    rect(ctx, 82, 121, 3, 3, "#d6bc74");
    rect(ctx, 68, 101, 24, 6, "#c59a5c");
    rect(ctx, 67, 133, 26, 4, "#34343a");
    rect(ctx, 70, 137, 20, 5, "#50555c");
  });

  texture(scene, "house-small", 112, 118, (ctx) => {
    rect(ctx, 18, 101, 78, 8, "rgba(28, 30, 34, 0.35)");
    rect(ctx, 18, 55, 76, 46, "#d7b67e");
    rect(ctx, 68, 55, 26, 46, "#b88662");
    woodPlanks(ctx, 18, 55, 76, 46);
    rect(ctx, 14, 97, 84, 8, "#66554a");

    rect(ctx, 8, 47, 96, 10, "#5e252c");
    poly(ctx, [[8, 47], [56, 16], [104, 47], [94, 58], [56, 34], [18, 58]], "#8f2d31");
    poly(ctx, [[18, 46], [56, 22], [94, 46], [56, 35]], "#d0523c");
    poly(ctx, [[56, 22], [94, 46], [86, 52], [56, 35]], "#b23835");
    roofTiles(ctx, 20, 41, 72, 14, "#e56b4a", "#7b2c31");
    rect(ctx, 34, 30, 12, 18, "#6d3035");
    rect(ctx, 36, 20, 10, 12, "#494851");
    rect(ctx, 35, 17, 14, 5, "#77747c");

    rect(ctx, 42, 74, 22, 27, "#7a4938");
    rect(ctx, 46, 79, 14, 22, "#9e6848");
    rect(ctx, 62, 88, 3, 3, "#f3c36b");
    rect(ctx, 39, 70, 28, 6, "#55535b");

    rect(ctx, 23, 69, 18, 16, "#332e35");
    rect(ctx, 26, 72, 12, 9, "#84b4c3");
    rect(ctx, 73, 67, 16, 16, "#332e35");
    rect(ctx, 76, 70, 10, 9, "#84b4c3");
    rect(ctx, 88, 62, 6, 34, "rgba(65, 45, 40, 0.22)");
  });

  texture(scene, "shop", 144, 128, (ctx) => {
    rect(ctx, 16, 111, 112, 9, "rgba(28, 30, 34, 0.35)");
    rect(ctx, 20, 58, 104, 52, "#ddc08a");
    rect(ctx, 86, 58, 38, 52, "#b88a61");
    woodPlanks(ctx, 20, 58, 104, 52);
    rect(ctx, 15, 106, 114, 8, "#67564a");

    rect(ctx, 8, 48, 128, 12, "#61252d");
    poly(ctx, [[8, 48], [72, 14], [136, 48], [124, 61], [72, 30], [20, 61]], "#963034");
    poly(ctx, [[20, 47], [72, 20], [124, 47], [72, 33]], "#df5d40");
    poly(ctx, [[72, 20], [124, 47], [114, 55], [72, 33]], "#bd3936");
    roofTiles(ctx, 18, 42, 108, 17, "#ef7050", "#7b2c31");
    rect(ctx, 70, 19, 4, 34, "#64262f");

    rect(ctx, 42, 76, 60, 19, "#40353b");
    rect(ctx, 46, 79, 52, 11, "#f1c15d");
    rect(ctx, 49, 81, 46, 3, "#ffe199");
    rect(ctx, 54, 91, 36, 5, "#6a3f35");
    rect(ctx, 61, 88, 20, 23, "#7d4935");
    rect(ctx, 65, 92, 12, 19, "#9d6748");
    rect(ctx, 79, 99, 3, 3, "#f4c96c");
    rect(ctx, 58, 84, 30, 3, "#4d3031");

    rect(ctx, 30, 70, 18, 15, "#302e35");
    rect(ctx, 33, 73, 12, 8, "#88b8c4");
    rect(ctx, 100, 70, 18, 15, "#302e35");
    rect(ctx, 103, 73, 12, 8, "#88b8c4");
    rect(ctx, 92, 58, 32, 48, "rgba(65, 45, 40, 0.22)");
  });

  texture(scene, "collector-house", 128, 136, (ctx) => {
    rect(ctx, 18, 116, 94, 9, "rgba(22, 22, 28, 0.4)");
    rect(ctx, 20, 62, 88, 54, "#c8ad91");
    rect(ctx, 76, 62, 32, 54, "#927163");
    rect(ctx, 22, 72, 82, 2, "#a48778");
    rect(ctx, 22, 88, 82, 2, "#a48778");
    rect(ctx, 16, 111, 98, 8, "#51494b");

    rect(ctx, 8, 50, 112, 13, "#512536");
    poly(ctx, [[8, 50], [64, 12], [120, 50], [108, 64], [64, 30], [20, 64]], "#702b42");
    poly(ctx, [[20, 48], [64, 18], [108, 48], [64, 32]], "#b84b45");
    poly(ctx, [[64, 18], [108, 48], [98, 57], [64, 32]], "#883342");
    roofTiles(ctx, 21, 42, 86, 18, "#cc5b4a", "#532536");
    rect(ctx, 62, 18, 4, 42, "#3e2535");
    rect(ctx, 43, 31, 42, 19, "#262530");
    rect(ctx, 49, 36, 30, 9, "#151821");
    rect(ctx, 59, 36, 10, 9, "#9c86d7");

    rect(ctx, 48, 84, 24, 32, "#4f374b");
    rect(ctx, 52, 89, 16, 27, "#6d4a62");
    rect(ctx, 70, 99, 3, 3, "#dac37a");
    rect(ctx, 44, 80, 32, 7, "#3e3d48");

    rect(ctx, 28, 75, 20, 18, "#282934");
    rect(ctx, 31, 79, 14, 10, "#7c8fbd");
    rect(ctx, 82, 75, 18, 18, "#282934");
    rect(ctx, 85, 79, 12, 10, "#7c8fbd");
    rect(ctx, 98, 64, 10, 46, "rgba(35, 28, 35, 0.28)");
  });

  texture(scene, "lamp-0", 38, 72, (ctx) => {
    rect(ctx, 11, 65, 16, 5, "rgba(20, 22, 27, 0.36)");
    rect(ctx, 13, 58, 12, 6, "#2b2e36");
    rect(ctx, 9, 63, 20, 5, "#4f535e");
    rect(ctx, 11, 60, 16, 2, "#737983");

    rect(ctx, 15, 28, 8, 32, "#1d2028");
    rect(ctx, 17, 29, 4, 31, "#555b66");
    rect(ctx, 18, 30, 2, 29, "#838995");

    rect(ctx, 7, 16, 24, 18, "#1d2028");
    rect(ctx, 9, 14, 20, 4, "#444954");
    rect(ctx, 11, 10, 16, 5, "#636a76");
    rect(ctx, 14, 6, 10, 5, "#333842");
    rect(ctx, 17, 3, 4, 5, "#6f7783");

    rect(ctx, 10, 18, 18, 14, "#5d4631");
    rect(ctx, 12, 19, 14, 12, "#f7ad46");
    rect(ctx, 14, 20, 10, 10, "#ffd978");
    rect(ctx, 16, 21, 6, 8, "#fff0ad");
    rect(ctx, 10, 18, 3, 14, "#2a2d35");
    rect(ctx, 25, 18, 3, 14, "#2a2d35");
    rect(ctx, 12, 31, 14, 3, "#2a2d35");
    rect(ctx, 13, 18, 2, 14, "rgba(255, 255, 255, 0.24)");
    rect(ctx, 27, 22, 3, 2, "#99a0a9");
  });

  texture(scene, "lamp-1", 38, 72, (ctx) => {
    rect(ctx, 11, 65, 16, 5, "rgba(20, 22, 27, 0.36)");
    rect(ctx, 13, 58, 12, 6, "#2b2e36");
    rect(ctx, 9, 63, 20, 5, "#4f535e");
    rect(ctx, 11, 60, 16, 2, "#737983");

    rect(ctx, 15, 28, 8, 32, "#1d2028");
    rect(ctx, 17, 29, 4, 31, "#555b66");
    rect(ctx, 18, 30, 2, 29, "#838995");

    rect(ctx, 7, 16, 24, 18, "#1d2028");
    rect(ctx, 9, 14, 20, 4, "#444954");
    rect(ctx, 11, 10, 16, 5, "#636a76");
    rect(ctx, 14, 6, 10, 5, "#333842");
    rect(ctx, 17, 3, 4, 5, "#6f7783");

    rect(ctx, 10, 18, 18, 14, "#5d4631");
    rect(ctx, 12, 19, 14, 12, "#ff9533");
    rect(ctx, 14, 20, 10, 10, "#ffc75a");
    rect(ctx, 16, 21, 6, 8, "#fff6b8");
    rect(ctx, 10, 18, 3, 14, "#2a2d35");
    rect(ctx, 25, 18, 3, 14, "#2a2d35");
    rect(ctx, 12, 31, 14, 3, "#2a2d35");
    rect(ctx, 13, 18, 2, 14, "rgba(255, 255, 255, 0.24)");
    rect(ctx, 27, 22, 3, 2, "#99a0a9");
  });

  texture(scene, "rock", 34, 28, (ctx) => {
    rect(ctx, 6, 12, 22, 12, "#636a75");
    rect(ctx, 10, 6, 18, 12, "#858b95");
    rect(ctx, 2, 16, 12, 8, "#4d535c");
    rect(ctx, 14, 8, 6, 4, "#a3a8af");
  });

  texture(scene, "big-rock", 70, 58, (ctx) => {
    rect(ctx, 12, 24, 44, 24, "#555d68");
    rect(ctx, 20, 10, 38, 30, "#7b828e");
    rect(ctx, 42, 22, 22, 28, "#666d78");
    rect(ctx, 6, 34, 22, 16, "#454c55");
    rect(ctx, 26, 14, 10, 8, "#a3a9b1");
  });

  texture(scene, "flower-white", 20, 20, (ctx) => {
    rect(ctx, 9, 8, 2, 9, "#397d3e");
    rect(ctx, 5, 5, 4, 4, "#f2f5ee");
    rect(ctx, 11, 5, 4, 4, "#f2f5ee");
    rect(ctx, 8, 2, 4, 4, "#f2f5ee");
    rect(ctx, 8, 8, 4, 4, "#f4c655");
  });

  texture(scene, "lily", 30, 22, (ctx) => {
    rect(ctx, 5, 6, 20, 12, "#4f9b45");
    rect(ctx, 16, 8, 8, 3, "#3e7439");
    rect(ctx, 13, 4, 4, 4, "#e7d48c");
  });

  [0, 1, 2].forEach((frame) => {
    texture(scene, `dragon-flame-${frame}`, 112, 52, (ctx) => {
      const reach = 76 + frame * 12;
      poly(ctx, [[0, 24], [reach, 4], [108, 26], [reach, 48]], "#f05a16");
      poly(ctx, [[4, 25], [reach - 8, 10], [100, 26], [reach - 8, 42]], "#ff951e");
      poly(ctx, [[9, 25], [reach - 20, 17], [88, 26], [reach - 20, 35]], "#ffd13a");
      poly(ctx, [[18, 25], [reach - 34, 22], [70, 26], [reach - 34, 30]], "#fff4a0");
      rect(ctx, 5 + frame * 2, 18, 12, 4, "#ff7214");
      rect(ctx, 20 + frame * 4, 10, 8, 4, "#ff8a16");
      rect(ctx, 34 + frame * 3, 42, 10, 4, "#e74612");
      rect(ctx, 86 + frame * 4, 12, 6, 4, "#ff6a13");
      rect(ctx, 94, 34, 8, 4, "#ff7d15");
    });
  });
}

function createInteriorObjects(scene) {
  texture(scene, "bed", 56, 72, (ctx) => {
    rect(ctx, 5, 5, 46, 60, "#6d483e");
    rect(ctx, 9, 10, 38, 50, "#c95055");
    rect(ctx, 12, 12, 32, 16, "#efd7b2");
    rect(ctx, 12, 36, 32, 18, "#df735d");
  });

  texture(scene, "table", 58, 42, (ctx) => {
    rect(ctx, 8, 8, 42, 24, "#8e5a38");
    rect(ctx, 4, 12, 50, 16, "#b87343");
    rect(ctx, 10, 30, 8, 10, "#613f2d");
    rect(ctx, 40, 30, 8, 10, "#613f2d");
  });

  texture(scene, "card-table", 72, 46, (ctx) => {
    rect(ctx, 8, 8, 56, 28, "#714a3b");
    rect(ctx, 4, 12, 64, 18, "#9b6240");
    rect(ctx, 16, 14, 12, 16, "#e5d4a0");
    rect(ctx, 30, 14, 12, 16, "#86a7d8");
    rect(ctx, 44, 14, 12, 16, "#d88b6a");
  });

  texture(scene, "chair", 28, 34, (ctx) => {
    rect(ctx, 6, 4, 16, 14, "#8b5635");
    rect(ctx, 4, 16, 20, 12, "#b36d3d");
    rect(ctx, 6, 28, 4, 5, "#5f3d2b");
    rect(ctx, 18, 28, 4, 5, "#5f3d2b");
  });

  texture(scene, "bookcase", 48, 74, (ctx) => {
    rect(ctx, 4, 4, 40, 64, "#6e4430");
    rect(ctx, 8, 10, 32, 12, "#b07643");
    rect(ctx, 8, 28, 32, 12, "#b07643");
    rect(ctx, 8, 46, 32, 12, "#b07643");
    rect(ctx, 10, 12, 5, 10, "#5d78b5");
    rect(ctx, 17, 12, 6, 10, "#b8575d");
    rect(ctx, 26, 30, 7, 10, "#d2a64c");
    rect(ctx, 11, 48, 8, 10, "#69a765");
  });

  texture(scene, "counter", 108, 42, (ctx) => {
    rect(ctx, 4, 6, 100, 26, "#7d5036");
    rect(ctx, 0, 12, 108, 18, "#a76c42");
    rect(ctx, 8, 30, 92, 8, "#54372a");
  });

  texture(scene, "chest-closed", 42, 34, (ctx) => {
    rect(ctx, 4, 12, 34, 18, "#8f5734");
    rect(ctx, 6, 6, 30, 12, "#b8753d");
    rect(ctx, 19, 14, 5, 8, "#f0c45b");
    rect(ctx, 4, 20, 34, 3, "#5b3829");
  });

  texture(scene, "chest-open", 42, 40, (ctx) => {
    rect(ctx, 4, 16, 34, 18, "#8f5734");
    rect(ctx, 6, 4, 30, 12, "#704128");
    rect(ctx, 19, 20, 5, 8, "#f0c45b");
    rect(ctx, 8, 14, 26, 4, "#f6d36e");
  });

  texture(scene, "plant", 28, 44, (ctx) => {
    rect(ctx, 8, 28, 12, 12, "#a45f3e");
    rect(ctx, 4, 10, 12, 18, "#529b45");
    rect(ctx, 13, 5, 12, 22, "#6fba50");
    rect(ctx, 9, 17, 14, 10, "#43873f");
  });

  texture(scene, "crystal", 30, 42, (ctx) => {
    diamond(ctx, 15, 18, 13, "#9b82d7");
    diamond(ctx, 15, 16, 7, "#d8c5ff");
    rect(ctx, 7, 31, 16, 6, "#5d4b70");
  });

  texture(scene, "card-sparkle-0", 18, 18, (ctx) => {
    rect(ctx, 8, 2, 2, 14, "#ffe58a");
    rect(ctx, 2, 8, 14, 2, "#ffe58a");
  });

  texture(scene, "card-sparkle-1", 18, 18, (ctx) => {
    rect(ctx, 8, 4, 2, 10, "#fff5be");
    rect(ctx, 4, 8, 10, 2, "#fff5be");
    rect(ctx, 7, 7, 4, 4, "#ffe58a");
  });
}

function createPlayer(scene) {
  const frameWidth = 40;
  const frameHeight = 56;
  const directions = ["down", "left", "right", "up"];
  const canvasTexture = scene.textures.createCanvas("hero", frameWidth * 3, frameHeight * 4);
  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;

  directions.forEach((dir, row) => {
    for (let frame = 0; frame < 3; frame += 1) {
      drawHeroFrame(ctx, frame * frameWidth, row * frameHeight, dir, frame);
    }
  });

  canvasTexture.refresh();
  scene.textures.addSpriteSheet("hero-sheet", canvasTexture.getSourceImage(), {
    frameWidth,
    frameHeight
  });
}

function drawHeroFrame(ctx, ox, oy, dir, frame) {
  const swing = frame === 1 ? 8 : frame === 2 ? -8 : 0;
  const bob = frame === 0 ? 0 : 2;
  const leftStride = frame === 1 ? -5 : frame === 2 ? 5 : 0;
  const rightStride = -leftStride;
  const leftLegX = frame === 1 ? 8 : frame === 2 ? 13 : 10;
  const rightLegX = frame === 1 ? 24 : frame === 2 ? 19 : 22;

  rect(ctx, ox + 7, oy + 51, 27, 4, "rgba(25, 27, 31, 0.36)");

  rect(ctx, ox + leftLegX - 1, oy + 38 + leftStride, 9, 13, "#17151b");
  rect(ctx, ox + rightLegX - 1, oy + 38 + rightStride, 9, 13, "#17151b");
  rect(ctx, ox + leftLegX + 1, oy + 38 + leftStride, 6, 12, "#304160");
  rect(ctx, ox + rightLegX, oy + 38 + rightStride, 6, 12, "#304160");
  rect(ctx, ox + leftLegX - 2, oy + 50 + leftStride, 11, 4, "#111015");
  rect(ctx, ox + rightLegX - 2, oy + 50 + rightStride, 11, 4, "#111015");
  rect(ctx, ox + leftLegX + 1, oy + 48 + leftStride, 6, 2, "#5f76a2");
  rect(ctx, ox + rightLegX, oy + 48 + rightStride, 6, 2, "#5f76a2");

  rect(ctx, ox + 8, oy + 24 + bob, 24, 20, "#17151b");
  rect(ctx, ox + 11, oy + 25 + bob, 18, 18, "#315f78");
  rect(ctx, ox + 12, oy + 25 + bob, 16, 5, "#6aa7b2");
  rect(ctx, ox + 11, oy + 36 + bob, 18, 4, "#25314a");
  rect(ctx, ox + 17, oy + 36 + bob, 7, 4, "#d6aa55");
  rect(ctx, ox + 14, oy + 28 + bob, 11, 10, "#3f7890");
  rect(ctx, ox + 26, oy + 27 + bob, 4, 13, "#714936");

  if (dir === "left") {
    rect(ctx, ox + 4, oy + 25 + swing, 7, 19, "#17151b");
    rect(ctx, ox + 4, oy + 31 + swing, 5, 12, "#e2a47b");
    rect(ctx, ox + 29, oy + 25 - swing, 7, 19, "#17151b");
    rect(ctx, ox + 30, oy + 28 - swing, 5, 13, "#315f78");
  } else if (dir === "right") {
    rect(ctx, ox + 4, oy + 25 - swing, 7, 19, "#17151b");
    rect(ctx, ox + 5, oy + 28 - swing, 5, 13, "#315f78");
    rect(ctx, ox + 29, oy + 25 + swing, 7, 19, "#17151b");
    rect(ctx, ox + 31, oy + 31 + swing, 5, 12, "#e2a47b");
  } else {
    rect(ctx, ox + 3, oy + 24 + swing, 8, 20, "#17151b");
    rect(ctx, ox + 4, oy + 31 + swing, 5, 12, "#e2a47b");
    rect(ctx, ox + 29, oy + 24 - swing, 8, 20, "#17151b");
    rect(ctx, ox + 31, oy + 31 - swing, 5, 12, "#e2a47b");
  }

  rect(ctx, ox + 11, oy + 7 + bob, 18, 19, "#17151b");

  if (dir === "up") {
    rect(ctx, ox + 12, oy + 6 + bob, 16, 19, "#4d2e35");
    rect(ctx, ox + 10, oy + 11 + bob, 20, 10, "#2e2029");
    rect(ctx, ox + 15, oy + 4 + bob, 10, 5, "#6a3e3a");
    rect(ctx, ox + 14, oy + 22 + bob, 12, 3, "#6a3e3a");
  } else if (dir === "left") {
    rect(ctx, ox + 12, oy + 8 + bob, 14, 17, "#e2a47b");
    rect(ctx, ox + 11, oy + 7 + bob, 15, 8, "#4d2e35");
    rect(ctx, ox + 9, oy + 11 + bob, 6, 10, "#2e2029");
    rect(ctx, ox + 12, oy + 16 + bob, 3, 3, "#17151b");
    rect(ctx, ox + 10, oy + 19 + bob, 4, 2, "#c47b64");
    rect(ctx, ox + 20, oy + 23 + bob, 6, 3, "#6a3e3a");
  } else if (dir === "right") {
    rect(ctx, ox + 14, oy + 8 + bob, 14, 17, "#e2a47b");
    rect(ctx, ox + 14, oy + 7 + bob, 15, 8, "#4d2e35");
    rect(ctx, ox + 25, oy + 11 + bob, 6, 10, "#2e2029");
    rect(ctx, ox + 25, oy + 16 + bob, 3, 3, "#17151b");
    rect(ctx, ox + 27, oy + 19 + bob, 4, 2, "#c47b64");
    rect(ctx, ox + 14, oy + 23 + bob, 6, 3, "#6a3e3a");
  } else {
    rect(ctx, ox + 12, oy + 8 + bob, 16, 17, "#e2a47b");
    rect(ctx, ox + 11, oy + 7 + bob, 18, 8, "#4d2e35");
    rect(ctx, ox + 10, oy + 11 + bob, 5, 10, "#2e2029");
    rect(ctx, ox + 25, oy + 11 + bob, 5, 10, "#2e2029");
    rect(ctx, ox + 15, oy + 16 + bob, 3, 3, "#17151b");
    rect(ctx, ox + 22, oy + 16 + bob, 3, 3, "#17151b");
    rect(ctx, ox + 17, oy + 21 + bob, 6, 2, "#b8665e");
    rect(ctx, ox + 15, oy + 5 + bob, 10, 4, "#6a3e3a");
  }

  rect(ctx, ox + 13, oy + 24 + bob, 14, 2, "#6f3f39");
}

function createDragon(scene) {
  const frameWidth = 112;
  const frameHeight = 84;
  const canvasTexture = scene.textures.createCanvas("dragon", frameWidth * 7, frameHeight);
  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;

  for (let frame = 0; frame < 4; frame += 1) {
    drawDragonFrame(ctx, frame * frameWidth, 0, frame, false);
  }
  for (let frame = 0; frame < 3; frame += 1) {
    drawDragonFrame(ctx, (frame + 4) * frameWidth, 0, frame, true);
  }

  canvasTexture.refresh();
  scene.textures.addSpriteSheet("dragon-sheet", canvasTexture.getSourceImage(), {
    frameWidth,
    frameHeight
  });
}

function drawDragonFrame(ctx, ox, oy, frame, breathing) {
  const bob = frame % 2 === 0 ? 0 : 2;
  const step = frame === 1 ? 3 : frame === 3 ? -3 : 0;
  const wing = breathing ? -5 : frame % 2 === 0 ? 0 : -3;
  const jaw = breathing ? 3 : 0;

  rect(ctx, ox + 18, oy + 72, 70, 5, "rgba(20, 18, 18, 0.36)");

  poly(ctx, [[ox + 16, oy + 51], [ox + 4, oy + 62], [ox + 18, oy + 64], [ox + 31, oy + 56], [ox + 30, oy + 49]], "#171016");
  poly(ctx, [[ox + 21, oy + 51], [ox + 7, oy + 60], [ox + 19, oy + 61], [ox + 31, oy + 54]], "#812815");
  rect(ctx, ox + 8, oy + 61, 8, 4, "#ff8b1a");

  poly(ctx, [[ox + 62, oy + 37 + wing], [ox + 83, oy + 9 + wing], [ox + 104, oy + 21 + wing], [ox + 89, oy + 47], [ox + 72, oy + 50]], "#161016");
  poly(ctx, [[ox + 67, oy + 38 + wing], [ox + 84, oy + 16 + wing], [ox + 99, oy + 23 + wing], [ox + 86, oy + 42], [ox + 73, oy + 45]], "#7c1d18");
  rect(ctx, ox + 78, oy + 22 + wing, 4, 20, "#d7471c");
  rect(ctx, ox + 88, oy + 25 + wing, 3, 14, "#d7471c");

  rect(ctx, ox + 42, oy + 50 + bob, 42, 18, "#150f12");
  rect(ctx, ox + 39, oy + 47 + bob, 40, 18, "#30130f");
  rect(ctx, ox + 45, oy + 45 + bob, 35, 16, "#7e2411");
  rect(ctx, ox + 51, oy + 48 + bob, 25, 12, "#b63b12");
  rect(ctx, ox + 57, oy + 51 + bob, 18, 7, "#e26618");
  rect(ctx, ox + 45, oy + 57 + bob, 4, 5, "#ff8a1f");
  rect(ctx, ox + 57, oy + 46 + bob, 4, 4, "#ff8a1f");
  rect(ctx, ox + 70, oy + 53 + bob, 4, 4, "#ff8a1f");

  poly(ctx, [[ox + 30, oy + 39 + bob], [ox + 18, oy + 28 + bob], [ox + 9, oy + 33 + bob], [ox + 15, oy + 42 + bob], [ox + 29, oy + 44 + bob]], "#171016");
  poly(ctx, [[ox + 32, oy + 40 + bob], [ox + 20, oy + 31 + bob], [ox + 13, oy + 35 + bob], [ox + 18, oy + 40 + bob], [ox + 30, oy + 42 + bob]], "#c64714");
  rect(ctx, ox + 18, oy + 30 + bob, 5, 3, "#ff8b1a");
  rect(ctx, ox + 22, oy + 27 + bob, 5, 3, "#f6bd4a");

  rect(ctx, ox + 23, oy + 35 + bob, 23, 18, "#171016");
  rect(ctx, ox + 25, oy + 35 + bob, 20, 15, "#8f2c11");
  rect(ctx, ox + 28, oy + 38 + bob, 13, 10, "#c04413");
  rect(ctx, ox + 29, oy + 41 + bob, 8, 5, "#f1b04d");

  rect(ctx, ox + 9, oy + 38 + bob, 17, 9 + jaw, "#171016");
  rect(ctx, ox + 10, oy + 39 + bob, 14, 6 + jaw, "#b73a12");
  rect(ctx, ox + 8, oy + 41 + bob, 4, 3, "#f0b34b");
  rect(ctx, ox + 18, oy + 37 + bob, 3, 3, "#ffda52");
  rect(ctx, ox + 12, oy + 36 + bob, 3, 2, "#111015");

  rect(ctx, ox + 23, oy + 30 + bob, 5, 5, "#ff8b1a");
  rect(ctx, ox + 31, oy + 27 + bob, 5, 5, "#f05b16");
  rect(ctx, ox + 39, oy + 31 + bob, 4, 4, "#ff9b21");

  rect(ctx, ox + 42 + step, oy + 63, 7, 11, "#171016");
  rect(ctx, ox + 44 + step, oy + 63, 5, 9, "#76200f");
  rect(ctx, ox + 39 + step, oy + 72, 14, 4, "#171016");
  rect(ctx, ox + 67 - step, oy + 63, 7, 11, "#171016");
  rect(ctx, ox + 69 - step, oy + 63, 5, 9, "#76200f");
  rect(ctx, ox + 64 - step, oy + 72, 14, 4, "#171016");

  rect(ctx, ox + 48, oy + 39 + bob, 7, 3, "#ff9b21");
  rect(ctx, ox + 60, oy + 42 + bob, 6, 3, "#ff9b21");

  if (breathing) {
    rect(ctx, ox + 1, oy + 41 + bob, 9, 4, "#ff7a15");
    rect(ctx, ox - 4, oy + 39 + bob, 7, 8, "#ffb52e");
  }
}

function createNpc(scene) {
  const frameWidth = 24;
  const frameHeight = 32;
  const canvasTexture = scene.textures.createCanvas("npc", frameWidth * 2, frameHeight * 3);
  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;
  const colors = [
    ["#7b4a30", "#75a35c", "#3c4c7e"],
    ["#4b3b42", "#ba6a3f", "#5f4738"],
    ["#d8d0bc", "#615377", "#3e3b45"]
  ];

  colors.forEach((palette, row) => {
    for (let frame = 0; frame < 2; frame += 1) {
      const ox = frame * frameWidth;
      const oy = row * frameHeight;
      rect(ctx, ox + 8, oy + 4, 8, 8, palette[0]);
      rect(ctx, ox + 6, oy + 10, 12, 9, "#efb58c");
      rect(ctx, ox + 6, oy + 18, 12, 9, palette[1]);
      rect(ctx, ox + 7, oy + 26, 4, 4, palette[2]);
      rect(ctx, ox + 14, oy + 26, 4, 4, palette[2]);
      rect(ctx, ox + 5, oy + 19 + frame, 4, 6, "#efb58c");
      rect(ctx, ox + 16, oy + 20 - frame, 4, 6, "#efb58c");
      rect(ctx, ox + 8, oy + 13, 2, 2, "#25242a");
      rect(ctx, ox + 14, oy + 13, 2, 2, "#25242a");
    }
  });

  canvasTexture.refresh();
  scene.textures.addSpriteSheet("npc-sheet", canvasTexture.getSourceImage(), {
    frameWidth,
    frameHeight
  });
}

function createUi(scene) {
  texture(scene, "card-icon", 24, 30, (ctx) => {
    rect(ctx, 3, 2, 18, 26, "#f2ddb1");
    rect(ctx, 5, 5, 14, 20, "#a95d53");
    rect(ctx, 8, 8, 8, 6, "#f2be60");
    rect(ctx, 8, 17, 8, 4, "#6d8fc7");
  });
}
