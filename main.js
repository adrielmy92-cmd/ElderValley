import BootScene from "./scenes/BootScene.js?v=194";
import PreloadScene from "./scenes/PreloadScene.js?v=228";
import GamePreloadScene from "./scenes/GamePreloadScene.js?v=249";
import TitleScene from "./scenes/TitleScene.js?v=253";
import WorldScene from "./scenes/WorldScene.js?v=285";
import VillageWestScene from "./scenes/VillageWestScene.js?v=62";
import CemeteryScene from "./scenes/CemeteryScene.js?v=52";
import CityScene from "./scenes/CityScene.js?v=260";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=250";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=250";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=250";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=250";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=251";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=250";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=224";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=251";
import AlchemistHouseInteriorScene from "./scenes/AlchemistHouseInteriorScene.js?v=256";
import ForestScene from "./scenes/ForestScene.js?v=74";
import SwampScene from "./scenes/SwampScene.js?v=67";
import BeeScene from "./scenes/BeeScene.js?v=52";

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
    VillageWestScene,
    CemeteryScene,
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
