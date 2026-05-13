import BootScene from "./scenes/BootScene.js?v=129";
import PreloadScene from "./scenes/PreloadScene.js?v=129";
import TitleScene from "./scenes/TitleScene.js?v=129";
import WorldScene from "./scenes/WorldScene.js?v=129";
import CityScene from "./scenes/CityScene.js?v=129";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=129";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=129";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=129";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=129";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=129";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=129";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=129";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=129";

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
    WindmillLoadScene,
    WindmillInteriorScene,
    ShopInteriorScene,
    CollectorHouseScene
  ]
};

new Phaser.Game(config);
