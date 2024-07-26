import { map, player } from "../main.js";
import { c } from "../utils/canvas.js";

class MiniMap {
  constructor(canvasWidth, canvasHeight) {
    this.width = (2048 * 5) / 32;
    this.height = (2048 * 3) / 32;
    this.scale = 0.03125; // Scale of the mini-map (mini-map size / background size)
    this.positionX = canvasWidth - this.width - 10;
    this.positionY = canvasHeight - this.height - 10;
  }

  draw() {
    // Draw the mini-map
    c.fillStyle = "rgba(255, 255, 255, 0.7)";
    c.fillRect(this.positionX, this.positionY, this.width, this.height);

    // Draw the scaled-down background on the mini-map
    for (let row = 0; row < map.tilesCountY; row++) {
      for (let col = 0; col < map.tilesCountX; col++) {
        const tileIndex = row * map.tilesCountX + col;
        const tile = map.images[tileIndex];
        if (tile && tile.isLoaded) {
          const miniMapTileX =
            this.positionX + col * map.tileWidth * this.scale;
          const miniMapTileY =
            this.positionY + row * map.tileHeight * this.scale;
          c.drawImage(
            tile.image,
            miniMapTileX,
            miniMapTileY,
            map.tileWidth * this.scale,
            map.tileHeight * this.scale
          );
        }
      }
    }

    // Draw the player on the mini-map
    const miniMapPlayerX = this.positionX + player.x * this.scale;
    const miniMapPlayerY = this.positionY + player.y * this.scale;

    c.fillStyle = "red";

    c.beginPath();
    c.arc(
      miniMapPlayerX,
      miniMapPlayerY,
      player.radius * 0.3,
      0,
      Math.PI * 2,
      false
    );
    c.fill();
  }
}

export default MiniMap;
