import BootScene from "./scenes/BootScene.js?v=181";
import PreloadScene from "./scenes/PreloadScene.js?v=215";
import GamePreloadScene from "./scenes/GamePreloadScene.js?v=235";
import TitleScene from "./scenes/TitleScene.js?v=240";
import WorldScene from "./scenes/WorldScene.js?v=267";
import VillageWestScene from "./scenes/VillageWestScene.js?v=46";
import CemeteryScene from "./scenes/CemeteryScene.js?v=36";
import CityScene from "./scenes/CityScene.js?v=244";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=236";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=236";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=236";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=236";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=237";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=236";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=210";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=237";
import AlchemistHouseInteriorScene from "./scenes/AlchemistHouseInteriorScene.js?v=241";
import ForestScene from "./scenes/ForestScene.js?v=58";
import SwampScene from "./scenes/SwampScene.js?v=51";
import BeeScene from "./scenes/BeeScene.js?v=36";

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
