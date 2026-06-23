import BootScene from "./scenes/BootScene.js?v=191";
import PreloadScene from "./scenes/PreloadScene.js?v=225";
import GamePreloadScene from "./scenes/GamePreloadScene.js?v=245";
import TitleScene from "./scenes/TitleScene.js?v=250";
import WorldScene from "./scenes/WorldScene.js?v=277";
import VillageWestScene from "./scenes/VillageWestScene.js?v=56";
import CemeteryScene from "./scenes/CemeteryScene.js?v=46";
import CityScene from "./scenes/CityScene.js?v=254";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=246";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=246";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=246";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=246";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=247";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=246";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=220";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=247";
import AlchemistHouseInteriorScene from "./scenes/AlchemistHouseInteriorScene.js?v=251";
import ForestScene from "./scenes/ForestScene.js?v=68";
import SwampScene from "./scenes/SwampScene.js?v=61";
import BeeScene from "./scenes/BeeScene.js?v=46";

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
