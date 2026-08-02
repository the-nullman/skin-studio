import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type CameraMode = "perspective" | "orthographic";
export type ViewPreset = "front" | "back" | "left" | "right" | "top" | "bottom";

const ORTHO_SIZE = 28;

// Offset direction (from the orbit target to the camera) for each preset —
// the camera looks back toward the target, i.e. in the opposite direction.
const VIEW_DIRECTIONS: Record<ViewPreset, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

export class Viewport {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  perspCamera: THREE.PerspectiveCamera;
  orthoCamera: THREE.OrthographicCamera;
  controls: OrbitControls;
  mode: CameraMode = "perspective";
  private container: HTMLElement;
  private raf = 0;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene.background = null;
    // Flat ambient at intensity PI: under three's physically-correct lighting
    // a lambertian (roughness-1) surface reflects albedo * intensity / PI, so
    // this reproduces the texture's exact colors — same brightness as the 2D
    // view. Any directional term would over/under-light faces and shift hues.
    this.scene.add(new THREE.AmbientLight(0xffffff, Math.PI));

    const aspect = this.aspect();
    this.perspCamera = new THREE.PerspectiveCamera(35, aspect, 0.1, 1000);
    this.perspCamera.position.set(46, 36, 56);

    this.orthoCamera = new THREE.OrthographicCamera(
      -ORTHO_SIZE * aspect, ORTHO_SIZE * aspect, ORTHO_SIZE, -ORTHO_SIZE, 0.1, 1000,
    );
    this.orthoCamera.position.copy(this.perspCamera.position);

    this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
    this.controls.target.set(0, 2, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    // Left-drag is decided per-press (paint on the model, rotate on empty
    // space) by setLeftDragRotate; right rotates, middle pans, mirroring the
    // 2D canvas's pan buttons.
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    // Wheel is handled here, not by OrbitControls, so the modifiers can mean
    // what they do in the 2D view: plain wheel (and pinch) zooms, shift+wheel
    // pans. Middle-drag pans too.
    this.controls.enableZoom = false;
    this.renderer.domElement.addEventListener("wheel", this.onWheel, { passive: false });
    this.controls.update();

    this.resize();
    window.addEventListener("resize", this.resize);
    // The container also changes size when the user drags a panel splitter,
    // which fires no window resize — observe the element itself.
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.loop();
  }

  /**
   * Choose what a starting left-drag does. Called from the pointerdown
   * capture phase (on the canvas's parent, which runs before OrbitControls'
   * own target-phase listener) so painting on the model and orbiting from
   * empty space can share the left button.
   */
  setLeftDragRotate(rotate: boolean) {
    this.controls.mouseButtons.LEFT = rotate ? THREE.MOUSE.ROTATE : (null as unknown as THREE.MOUSE);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      this.panBy(e.deltaX, e.deltaY);
      return;
    }
    // A trackpad pinch arrives as ctrl+wheel with small deltas; a mouse wheel
    // sends ~100 per notch. One shared factor makes one of them unusable, so
    // scale them separately.
    this.zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  };

  private zoomBy(factor: number) {
    if (this.mode === "perspective") {
      const cam = this.perspCamera;
      const t = this.controls.target;
      const offset = cam.position.clone().sub(t);
      const dist = THREE.MathUtils.clamp(offset.length() * factor, 12, 400);
      cam.position.copy(t).add(offset.normalize().multiplyScalar(dist));
    } else {
      const cam = this.orthoCamera;
      cam.zoom = THREE.MathUtils.clamp(cam.zoom / factor, 0.15, 12);
      cam.updateProjectionMatrix();
    }
    this.controls.update();
  }

  private panBy(dx: number, dy: number) {
    const cam = this.activeCamera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    const h = Math.max(1, this.container.clientHeight);
    const worldPerPx = this.mode === "perspective"
      ? (2 * cam.position.distanceTo(this.controls.target) * Math.tan((this.perspCamera.fov * Math.PI) / 360)) / h
      : (this.orthoCamera.top - this.orthoCamera.bottom) / (this.orthoCamera.zoom * h);
    // Content follows the fingers (natural scrolling): camera moves with the
    // deltas horizontally and against them vertically (screen y is flipped).
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0).multiplyScalar(dx * worldPerPx);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1).multiplyScalar(-dy * worldPerPx);
    const offset = right.add(up);
    cam.position.add(offset);
    this.controls.target.add(offset);
    this.controls.update();
  }

  get activeCamera(): THREE.Camera {
    return this.mode === "perspective" ? this.perspCamera : this.orthoCamera;
  }

  setMode(mode: CameraMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    const cam = this.activeCamera;
    cam.position.copy(this.controls.object.position);
    cam.up.copy(this.controls.object.up);
    this.controls.object = cam as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    this.controls.update();
  }

  setView(view: ViewPreset) {
    const cam = this.activeCamera;
    const target = this.controls.target;
    const distance = cam.position.distanceTo(target) || 70;
    const [dx, dy, dz] = VIEW_DIRECTIONS[view];
    cam.position.set(target.x + dx * distance, target.y + dy * distance, target.z + dz * distance);
    // Looking straight down/up needs a non-parallel up vector, or the
    // orientation is degenerate; front is "up" on screen for top/bottom.
    cam.up.set(0, view === "top" || view === "bottom" ? 0 : 1, view === "top" || view === "bottom" ? 1 : 0);
    this.controls.update();
  }

  private aspect() {
    const { clientWidth, clientHeight } = this.container;
    return clientWidth / Math.max(1, clientHeight);
  }

  resize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();
    this.orthoCamera.left = -ORTHO_SIZE * aspect;
    this.orthoCamera.right = ORTHO_SIZE * aspect;
    this.orthoCamera.top = ORTHO_SIZE;
    this.orthoCamera.bottom = -ORTHO_SIZE;
    this.orthoCamera.updateProjectionMatrix();
  };

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.activeCamera);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
