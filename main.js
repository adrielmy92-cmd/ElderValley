import BootScene from "./scenes/BootScene.js?v=180";
import PreloadScene from "./scenes/PreloadScene.js?v=180";
import TitleScene from "./scenes/TitleScene.js?v=180";
import WorldScene from "./scenes/WorldScene.js?v=189";
import CityScene from "./scenes/CityScene.js?v=189";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=189";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=189";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=189";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=189";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=189";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=189";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=189";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=189";
import AlchemistHouseInteriorScene from "./scenes/AlchemistHouseInteriorScene.js?v=189";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#18202a",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    WorldScene,
    CityScene,
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
