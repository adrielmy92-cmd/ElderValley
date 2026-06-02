import BootScene from "./scenes/BootScene.js?v=180";
import PreloadScene from "./scenes/PreloadScene.js?v=211";
import GamePreloadScene from "./scenes/GamePreloadScene.js?v=218";
import TitleScene from "./scenes/TitleScene.js?v=232";
import WorldScene from "./scenes/WorldScene.js?v=229";
import CityScene from "./scenes/CityScene.js?v=213";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=209";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=209";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=209";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=209";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=210";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=209";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=209";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=210";
import AlchemistHouseInteriorScene from "./scenes/AlchemistHouseInteriorScene.js?v=210";
import ForestScene from "./scenes/ForestScene.js?v=27";
import SwampScene from "./scenes/SwampScene.js?v=20";
import BeeScene from "./scenes/BeeScene.js?v=5";

const isMobileDevice = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#18202a",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: isMobileDevice ? 1 : window.devicePixelRatio
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
      fps: isMobileDevice ? 30 : 60
    }
  },
  scene: [
    BootScene,
    PreloadScene,
    GamePreloadScene,
    TitleScene,
    WorldScene,
    CityScene,
    ForestScene,
    SwampScene,
    BeeScene,
    HouseInteriorScene,
    CardShopHouseScene,
    MiddleForgeInteriorScene,
    ReferenceHouseInteriorScene,
    AlchemistHouseInteriorScene,
    WindmillLoadScene,
    WindmillInteriorScene,
    ShopInteriorScene,
    CollectorHouseScene
  ]
};

new Phaser.Game(config);
