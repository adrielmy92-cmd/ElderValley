import BootScene from "./scenes/BootScene.js?v=199";
import PreloadScene from "./scenes/PreloadScene.js?v=233";
import GamePreloadScene from "./scenes/GamePreloadScene.js?v=258";
import TitleScene from "./scenes/TitleScene.js?v=258";
import WorldScene from "./scenes/WorldScene.js?v=294";
import VillageWestScene from "./scenes/VillageWestScene.js?v=71";
import CemeteryScene from "./scenes/CemeteryScene.js?v=60";
import CityScene from "./scenes/CityScene.js?v=268";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=258";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=258";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=258";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=258";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=259";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=258";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=229";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=259";
import AlchemistHouseInteriorScene from "./scenes/AlchemistHouseInteriorScene.js?v=264";
import ForestScene from "./scenes/ForestScene.js?v=82";
import SwampScene from "./scenes/SwampScene.js?v=75";
import BeeScene from "./scenes/BeeScene.js?v=60";

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
