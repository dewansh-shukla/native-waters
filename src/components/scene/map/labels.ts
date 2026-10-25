import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial, SRGBColorSpace, Vector3 } from "three";
import { MAP_TOP } from "@/experience/geography";

/** A map label rendered from a canvas texture, so no font fetch happens at runtime. */
export function riverLabel(text: string, point: Vector3): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "600 54px system-ui, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(12, 28, 31, 0.88)";
  ctx.strokeText(text, 256, 68);
  ctx.fillStyle = "#cfe9ee";
  ctx.fillText(text, 256, 68);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  const material = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new Sprite(material);
  sprite.position.set(point.x, MAP_TOP + 0.45, point.z);
  sprite.scale.set(2.1, 0.52, 1);
  sprite.renderOrder = 2;
  return sprite;
}
