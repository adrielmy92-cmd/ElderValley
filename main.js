import BootScene from "./scenes/BootScene.js?v=130";
import PreloadScene from "./scenes/PreloadScene.js?v=130";
import TitleScene from "./scenes/TitleScene.js?v=130";
import WorldScene from "./scenes/WorldScene.js?v=130";
import CityScene from "./scenes/CityScene.js?v=130";
import HouseInteriorScene from "./scenes/HouseInteriorScene.js?v=130";
import ShopInteriorScene from "./scenes/ShopInteriorScene.js?v=130";
import CollectorHouseScene from "./scenes/CollectorHouseScene.js?v=130";
import CardShopHouseScene from "./scenes/CardShopHouseScene.js?v=130";
import MiddleForgeInteriorScene from "./scenes/MiddleForgeInteriorScene.js?v=130";
import ReferenceHouseInteriorScene from "./scenes/ReferenceHouseInteriorScene.js?v=130";
import WindmillLoadScene from "./scenes/WindmillLoadScene.js?v=130";
import WindmillInteriorScene from "./scenes/WindmillInteriorScene.js?v=130";

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
