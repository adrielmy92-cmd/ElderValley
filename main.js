import BootScene from "./scenes/BootScene.js?v=202";
import PreloadScene from "./scenes/PreloadScene.js?v=237";
import GamePreloadScene from "./scenes/GamePreloadScene.js?v=265";
import TitleScene from "./scenes/TitleScene.js?v=262";
import WorldScene from "./scenes/WorldScene.js?v=303";
import VillageWestScene from "./scenes/VillageWestScene.js?v=80";
import CemeteryScene from "./scenes/CemeteryScene.js?v=69";
import CityScene from "./scenes/CityScene.js?v=277";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=267";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=267";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=267";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=267";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=270";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=267";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=232";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=268";
import AlchemistHouseInteriorScene from "./scenes/AlchemistHouseInteriorScene.js?v=275";
import ForestScene from "./scenes/ForestScene.js?v=91";
import SwampScene from "./scenes/SwampScene.js?v=84";
import BeeScene from "./scenes/BeeScene.js?v=69";

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
