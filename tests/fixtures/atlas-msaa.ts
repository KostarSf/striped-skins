import {
  CanvasTexture,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  NoToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { skinMaterial, type ModelShading } from "../../packages/viewer/src/models/SkinMaterial";

const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.toneMapping = NoToneMapping;
renderer.setSize(128, 128);
renderer.setClearColor(0, 0);
document.body.append(renderer.domElement);
const scene = new Scene();
scene.add(new HemisphereLight(0xffffff, 0xffffff, 3));
const geometry = new PlaneGeometry(1.4, 1.4);
const uv = geometry.getAttribute("uv");
for (let i = 0; i < uv.count; i++)
  uv.setXY(i, (16 + uv.getX(i) * 16) / 64, (16 + uv.getY(i) * 16) / 64);
const mesh = new Mesh(geometry);
scene.add(mesh);
const results = [];
for (const shading of ["flat", "studio"] as ModelShading[])
  for (const perspective of [false, true])
    for (const resolution of [64, 1024]) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = resolution;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(0, 0, resolution, resolution);
      ctx.clearRect(resolution / 4, resolution / 4, resolution / 4, resolution / 4);
      const texture = new CanvasTexture(canvas);
      texture.magFilter = texture.minFilter = NearestFilter;
      texture.generateMipmaps = texture.flipY = false;
      texture.colorSpace = SRGBColorSpace;
      const camera = perspective
        ? new PerspectiveCamera(37, 1, 0.1, 10)
        : new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 3;
      const count = (patched: boolean) => {
        const material = patched
          ? skinMaterial(texture, shading)
          : shading === "flat"
            ? new MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1 })
            : new MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.1 });
        mesh.material = material;
        let stray = 0;
        for (const angle of [0.1, 0.37, 0.8, 1.2]) {
          mesh.rotation.z = angle;
          renderer.render(scene, camera);
          const data = new Uint8Array(128 * 128 * 4);
          const gl = renderer.getContext();
          gl.readPixels(0, 0, 128, 128, gl.RGBA, gl.UNSIGNED_BYTE, data);
          for (let i = 3; i < data.length; i += 4) if (data[i]) stray++;
        }
        material.dispose();
        return stray;
      };
      results.push({
        shading,
        perspective,
        resolution,
        baseline: count(false),
        fixed: count(true),
      });
      // The correction must retain real partial-alpha pixels inside the UV region.
      ctx.fillStyle = "rgba(120,180,240,0.5)";
      ctx.fillRect(resolution / 4, resolution / 4, resolution / 4, resolution / 4);
      texture.needsUpdate = true;
      mesh.material = skinMaterial(texture, shading);
      renderer.render(scene, camera);
      const pixel = new Uint8Array(4);
      const gl = renderer.getContext();
      gl.readPixels(64, 64, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      Object.assign(results.at(-1)!, { partialAlpha: pixel[3] });
      mesh.material.dispose();
      texture.dispose();
    }
const output = document.createElement("pre");
output.id = "results";
output.textContent = JSON.stringify({
  antialias: renderer.getContext().getContextAttributes()!.antialias,
  samples: renderer.getContext().getParameter(renderer.getContext().SAMPLES),
  results,
});
document.body.append(output);
renderer.dispose();
geometry.dispose();
