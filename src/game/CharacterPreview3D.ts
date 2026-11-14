import * as THREE from 'three';
import { ProceduralModels, CharacterAppearance } from './ProceduralModels';

export type PreviewGesture = 'IDLE' | 'SALUTE' | 'WAVE' | 'MARCH' | 'AT_EASE';

export class CharacterPreview3D {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private avatarGroup: THREE.Group;
  private limbs: ReturnType<typeof ProceduralModels.createCorper> | null = null;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;

  private currentGesture: PreviewGesture = 'IDLE';
  private gestureTimer: number = 0;
  private autoRotate: boolean = true;

  constructor(container: HTMLDivElement, appearance: CharacterAppearance) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Slate studio backdrop

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    this.camera.position.set(0, 1.4, 3.6);
    this.camera.lookAt(0, 1.1, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // Studio pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.3, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.2 })
    );
    pedestal.position.y = -0.1;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    // Studio 3-point lighting
    const keyLight = new THREE.DirectionalLight(0xfff5eb, 2.0);
    keyLight.position.set(2.5, 4.0, 3.0);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-3.0, 2.0, 2.0);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 1.2);
    rimLight.position.set(0, 3.0, -3.0);
    this.scene.add(rimLight);

    this.avatarGroup = new THREE.Group();
    this.scene.add(this.avatarGroup);

    this.updateAppearance(appearance);

    this.tick = this.tick.bind(this);
    this.tick();
  }

  public updateAppearance(appearance: CharacterAppearance) {
    while (this.avatarGroup.children.length > 0) {
      this.avatarGroup.remove(this.avatarGroup.children[0]);
    }
    this.limbs = ProceduralModels.createCorper(appearance);
    this.avatarGroup.add(this.limbs.root);
  }

  public playGesture(gesture: PreviewGesture) {
    this.currentGesture = gesture;
    this.gestureTimer = gesture === 'IDLE' ? 0 : 2.5;
    if (gesture !== 'IDLE') {
      this.autoRotate = false;
      this.avatarGroup.rotation.y = 0; // face camera
    }
  }

  public setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
  }

  private tick() {
    this.animFrameId = requestAnimationFrame(this.tick);
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.autoRotate) {
      this.avatarGroup.rotation.y += 0.8 * delta;
    }

    // Gesture Animation Handling
    if (this.currentGesture !== 'IDLE') {
      this.gestureTimer -= delta;
      if (this.gestureTimer <= 0) {
        this.currentGesture = 'IDLE';
        this.autoRotate = true;
      }
    }

    if (this.limbs) {
      if (this.currentGesture === 'SALUTE') {
        this.limbs.rightArm.rotation.x = -2.2;
        this.limbs.rightArm.rotation.z = -0.5;
        this.limbs.leftArm.rotation.x = 0;
        this.limbs.leftLeg.rotation.x = 0;
        this.limbs.rightLeg.rotation.x = 0;
      } else if (this.currentGesture === 'WAVE') {
        this.limbs.rightArm.rotation.x = -2.4 + Math.sin(time * 10) * 0.3;
        this.limbs.rightArm.rotation.z = Math.sin(time * 10) * 0.4;
        this.limbs.leftArm.rotation.x = 0;
      } else if (this.currentGesture === 'MARCH') {
        const swing = Math.sin(time * 8) * 0.7;
        this.limbs.leftLeg.rotation.x = swing;
        this.limbs.rightLeg.rotation.x = -swing;
        this.limbs.leftArm.rotation.x = -swing;
        this.limbs.rightArm.rotation.x = swing;
      } else if (this.currentGesture === 'AT_EASE') {
        this.limbs.leftArm.rotation.x = 0.4;
        this.limbs.rightArm.rotation.x = 0.4;
        this.limbs.leftLeg.rotation.z = -0.15;
        this.limbs.rightLeg.rotation.z = 0.15;
      } else {
        // Idle
        this.limbs.leftArm.rotation.x = 0;
        this.limbs.rightArm.rotation.x = 0;
        this.limbs.leftArm.rotation.z = 0;
        this.limbs.rightArm.rotation.z = 0;
        this.limbs.leftLeg.rotation.x = 0;
        this.limbs.rightLeg.rotation.x = 0;
        this.limbs.leftLeg.rotation.z = 0;
        this.limbs.rightLeg.rotation.z = 0;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
