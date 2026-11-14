import * as THREE from 'three';

export interface CharacterAppearance {
  gender: 'MALE' | 'FEMALE';
  skinTone: 'LIGHT' | 'WARM_BROWN' | 'DEEP_BROWN' | 'DARK_EBONY';
  hairstyle: 'BUZZ_CUT' | 'AFRO_FADE' | 'BRAIDS' | 'CORNROWS' | 'LOW_TAPER';
  hairColor: 'BLACK' | 'DARK_BROWN' | 'GOLDEN_BLONDE';
  facialFeature: 'NONE' | 'AVIATOR_SHADES' | 'STUDENT_GLASSES' | 'MUSTACHE';
  uniformType: 'KHAKI_FULL' | 'WHITE_PT' | 'PLATOON_JERSEY';
  footwear: 'JUNGLE_BOOTS' | 'WHITE_SNEAKERS';
  accessories: 'WAIST_BAG' | 'ID_LANYARD' | 'BOTH' | 'NONE';
}

const SKIN_COLORS: Record<string, number> = {
  LIGHT: 0xb57850,
  WARM_BROWN: 0x824b2b,
  DEEP_BROWN: 0x542d17,
  DARK_EBONY: 0x30180a
};

const HAIR_COLORS: Record<string, number> = {
  BLACK: 0x111111,
  DARK_BROWN: 0x2b1d0c,
  GOLDEN_BLONDE: 0x8c6d2d
};

export class ProceduralModels {
  /**
   * Detailed 12-part composite NYSC Corper avatar with custom uniforms,
   * facial features, accessories, and articulated animation anchors.
   */
  public static createCorper(customization: CharacterAppearance): {
    root: THREE.Group;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    head: THREE.Group;
  } {
    const root = new THREE.Group();
    root.name = 'CorperAvatar';

    const skinHex = SKIN_COLORS[customization.skinTone] || SKIN_COLORS.WARM_BROWN;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65, metalness: 0.05 });

    const isKhaki = customization.uniformType === 'KHAKI_FULL';
    const isPT = customization.uniformType === 'WHITE_PT';
    const isJersey = customization.uniformType === 'PLATOON_JERSEY';

    // Uniform materials
    const khakiMat = new THREE.MeshStandardMaterial({ color: 0x5a5f36, roughness: 0.8, metalness: 0.02 });
    const whitePtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, metalness: 0.0 });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, metalness: 0.05 }); // Platoon Green

    const torsoMat = isKhaki ? khakiMat : isJersey ? jerseyMat : whitePtMat;
    const legMat = isKhaki ? khakiMat : whitePtMat;

    const greenAccentMat = new THREE.MeshStandardMaterial({ color: 0x006622, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.3, metalness: 0.7 });
    const blackBootMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 });
    const whiteSneakerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const bootMat = customization.footwear === 'JUNGLE_BOOTS' ? blackBootMat : whiteSneakerMat;

    // 1. Pelvis / Hips
    const hips = new THREE.Group();
    hips.position.y = 0.95;
    root.add(hips);

    const pelvisMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.22),
      legMat
    );
    pelvisMesh.castShadow = true;
    hips.add(pelvisMesh);

    // Belt & Buckle
    if (isKhaki) {
      const beltMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.05, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })
      );
      beltMesh.position.y = 0.06;
      const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.25), goldMat);
      beltMesh.add(buckleMesh);
      hips.add(beltMesh);
    }

    // Waist Bag Accessory
    if (customization.accessories === 'WAIST_BAG' || customization.accessories === 'BOTH') {
      const pouchMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.1, 0.09),
        greenAccentMat
      );
      pouchMesh.position.set(0.08, 0.03, 0.14);
      pouchMesh.castShadow = true;
      hips.add(pouchMesh);
    }

    // 2. Torso
    const torsoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.48, 0.24),
      torsoMat
    );
    torsoMesh.position.y = 0.32;
    torsoMesh.castShadow = true;
    hips.add(torsoMesh);

    // Collar / Epaulettes
    if (isKhaki || isJersey) {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), greenAccentMat);
      collar.position.y = 0.54;
      hips.add(collar);
    }

    // NYSC ID Card Lanyard Accessory
    if (customization.accessories === 'ID_LANYARD' || customization.accessories === 'BOTH') {
      const lanyardMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.26), lanyardMat);
      ribbon.position.set(0, 0.36, 0.01);
      hips.add(ribbon);

      // Plastic badge
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.12, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
      );
      badge.position.set(0, 0.22, 0.14);
      badge.castShadow = true;
      hips.add(badge);
    }

    // 3. Head & Hair
    const head = new THREE.Group();
    head.position.y = 0.68;
    hips.add(head);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 16),
      skinMat
    );
    headMesh.scale.set(1.0, 1.15, 1.0);
    headMesh.castShadow = true;
    head.add(headMesh);

    // NYSC Green Cap
    const capCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.145, 0.08, 16),
      greenAccentMat
    );
    capCrown.position.y = 0.09;
    capCrown.castShadow = true;
    head.add(capCrown);

    const capVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.12),
      greenAccentMat
    );
    capVisor.position.set(0, 0.06, 0.12);
    capVisor.rotation.x = 0.25;
    head.add(capVisor);

    // NYSC Gold Crest Badge
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), goldMat);
    crest.position.set(0, 0.1, 0.145);
    head.add(crest);

    // Hairstyle hair trim under cap
    const hairColorHex = HAIR_COLORS[customization.hairColor] || HAIR_COLORS.BLACK;
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColorHex, roughness: 0.9 });
    const hairTrim = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 12, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      hairMat
    );
    hairTrim.position.set(0, 0.02, 0);
    head.add(hairTrim);

    // 4. Facial Features (Glasses, Shades, Mustache)
    if (customization.facialFeature === 'AVIATOR_SHADES') {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1, metalness: 0.9 });
      const glasses = new THREE.Group();
      glasses.position.set(0, 0.02, 0.13);

      const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.02), glassMat);
      leftLens.position.x = -0.04;
      const rightLens = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.02), glassMat);
      rightLens.position.x = 0.04;
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.02), frameMat);

      glasses.add(leftLens, rightLens, bridge);
      head.add(glasses);
    } else if (customization.facialFeature === 'STUDENT_GLASSES') {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4 });
      const glasses = new THREE.Group();
      glasses.position.set(0, 0.02, 0.13);

      const leftRim = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.005, 8, 16), frameMat);
      leftRim.position.x = -0.045;
      const rightRim = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.005, 8, 16), frameMat);
      rightRim.position.x = 0.045;
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.01), frameMat);

      glasses.add(leftRim, rightRim, bridge);
      head.add(glasses);
    } else if (customization.facialFeature === 'MUSTACHE') {
      const mustacheMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.02, 0.025),
        hairMat
      );
      mustacheMesh.position.set(0, -0.05, 0.13);
      head.add(mustacheMesh);
    }

    // 5. Arms (Animated Groups)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.23, 0.48, 0);
    hips.add(leftArm);

    const leftArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.42, 8),
      isKhaki ? torsoMat : skinMat
    );
    leftArmMesh.position.y = -0.21;
    leftArmMesh.castShadow = true;
    leftArm.add(leftArmMesh);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.23, 0.48, 0);
    hips.add(rightArm);

    const rightArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.42, 8),
      isKhaki ? torsoMat : skinMat
    );
    rightArmMesh.position.y = -0.21;
    rightArmMesh.castShadow = true;
    rightArm.add(rightArmMesh);

    // 6. Legs & Boots (Animated Groups)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.11, -0.08, 0);
    hips.add(leftLeg);

    const leftLegMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.055, 0.65, 8),
      legMat
    );
    leftLegMesh.position.y = -0.32;
    leftLegMesh.castShadow = true;
    leftLeg.add(leftLegMesh);

    const leftBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, 0.22),
      bootMat
    );
    leftBoot.position.set(0, -0.68, 0.03);
    leftBoot.castShadow = true;
    leftLeg.add(leftBoot);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.11, -0.08, 0);
    hips.add(rightLeg);

    const rightLegMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.055, 0.65, 8),
      legMat
    );
    rightLegMesh.position.y = -0.32;
    rightLegMesh.castShadow = true;
    rightLeg.add(rightLegMesh);

    const rightBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, 0.22),
      bootMat
    );
    rightBoot.position.set(0, -0.68, 0.03);
    rightBoot.castShadow = true;
    rightLeg.add(rightBoot);

    return { root, leftLeg, rightLeg, leftArm, rightArm, head };
  }

  /**
   * Main Camp Entrance Gate with military boom barrier, security guard booth,
   * and green/white "NYSC PERMANENT ORIENTATION CAMP ISEYIN" archway.
   */
  public static createMainEntranceGate(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'MainEntranceGate';

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x006622, roughness: 0.6 }); // NYSC Green
    const archMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }); // White
    const boothMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // Red barrier
    const signMat = new THREE.MeshStandardMaterial({ color: 0x006622, roughness: 0.4 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.6 });

    // Twin Entrance Arch Pillars (12m apart)
    [-6, 6].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 1.6), pillarMat);
      pillar.position.set(x, 3.75, 0);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.2, 4), goldMat);
      cap.position.set(x, 8.1, 0);
      cap.rotation.y = Math.PI / 4;
      group.add(cap);
    });

    // Overhead Archway Beam
    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(14.5, 1.6, 1.4), archMat);
    archBeam.position.set(0, 7.0, 0);
    archBeam.castShadow = true;
    group.add(archBeam);

    // Welcome Signboard Banner
    const banner = new THREE.Mesh(new THREE.BoxGeometry(12.5, 1.1, 0.15), signMat);
    banner.position.set(0, 7.0, 0.8);
    group.add(banner);

    // Security Sentry Guard Booth
    const sentryBooth = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.4, 2.8), boothMat);
    sentryBooth.position.set(8.5, 1.7, 0);
    sentryBooth.castShadow = true;
    group.add(sentryBooth);

    const sentryRoof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.0, 4), pillarMat);
    sentryRoof.position.set(8.5, 3.9, 0);
    sentryRoof.rotation.y = Math.PI / 4;
    group.add(sentryRoof);

    // Military Boom Barrier across driveway
    const barrierPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), pillarMat);
    barrierPivot.position.set(4.8, 0.6, 0);
    group.add(barrierPivot);

    const boomArm = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.12, 0.12), barrierMat);
    boomArm.position.set(0, 0.85, 0);
    group.add(boomArm);

    return group;
  }

  /**
   * Administrative Headquarters: 2-storey office building for State Coordinator & Camp Director.
   */
  public static createAdminBuilding(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'AdminBuilding';

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x006622, roughness: 0.5 }); // Green NYSC roof
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });

    // Main 2-storey block
    const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(22, 7.0, 12), wallMat);
    mainBlock.position.y = 3.5;
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    group.add(mainBlock);

    // Pitched green roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(15, 2.8, 4), roofMat);
    roof.position.y = 8.4;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 1.0, 0.8);
    roof.castShadow = true;
    group.add(roof);

    // Portico entrance with columns
    for (const [px, pz] of [[-3.5, 6.8], [3.5, 6.8], [-1.2, 6.8], [1.2, 6.8]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5.0, 8), wallMat);
      col.position.set(px, 2.5, pz);
      col.castShadow = true;
      group.add(col);
    }

    const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.4, 3.2), roofMat);
    porticoRoof.position.set(0, 5.2, 6.4);
    group.add(porticoRoof);

    // Admin Signboard Banner
    const adminSign = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 0.15), roofMat);
    adminSign.position.set(0, 5.8, 6.5);
    group.add(adminSign);

    // Windows grid
    for (let floor = 2.0; floor <= 5.2; floor += 3.0) {
      for (let wx = -8.5; wx <= 8.5; wx += 3.4) {
        if (floor < 4 && Math.abs(wx) < 4) continue; // skip door
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.1), windowMat);
        win.position.set(wx, floor, 6.05);
        group.add(win);
      }
    }

    // Flagpole on front lawn
    const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 9.5, 8), goldMat);
    flagpole.position.set(0, 4.75, 10.5);
    flagpole.castShadow = true;
    group.add(flagpole);

    return group;
  }

  /**
   * Orientation Lecture Pavilion: Open-air multipurpose hall with canopy, stage, and podium.
   */
  public static createLecturePavilion(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LecturePavilion';

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x006622, roughness: 0.5 }); // Green NYSC roof
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x54361c, roughness: 0.7 });

    // Concrete pavilion floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 20), floorMat);
    floor.position.y = 0.2;
    floor.receiveShadow = true;
    group.add(floor);

    // Perimeter steel pillars supporting canopy
    for (let x = -12; x <= 12; x += 6) {
      for (const z of [-9, 9]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.2, 8), pillarMat);
        pillar.position.set(x, 3.3, z);
        pillar.castShadow = true;
        group.add(pillar);
      }
    }

    // Grand arched canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(28, 0.35, 22), canopyMat);
    canopy.position.y = 6.4;
    canopy.castShadow = true;
    group.add(canopy);

    // Elevated Stage at the front
    const stage = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 5.0), stageMat);
    stage.position.set(0, 0.6, -6.5);
    stage.castShadow = true;
    stage.receiveShadow = true;
    group.add(stage);

    // Speaker Podium on stage
    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.8), podiumMat);
    podium.position.set(0, 1.6, -5.5);
    podium.castShadow = true;
    group.add(podium);

    // Rows of Corper seating (benches / plastic chairs)
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }); // Blue plastic
    for (let rowZ = -2; rowZ <= 7; rowZ += 2.5) {
      for (const colX of [-8, -2.5, 2.5, 8]) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 0.45), benchMat);
        bench.position.set(colX, 0.45, rowZ);
        bench.castShadow = true;
        group.add(bench);
      }
    }

    return group;
  }

  /**
   * Hostels: 2-storey residential block.
   */
  public static createHostelBuilding(label: string = 'PLATOON HOSTEL'): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HostelBuilding';

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x4f5459, roughness: 0.4, metalness: 0.6 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x1a2e3b, roughness: 0.2, metalness: 0.8 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x006622, roughness: 0.6 });

    const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(20, 6.5, 9.5), wallMat);
    mainBlock.position.y = 3.25;
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    group.add(mainBlock);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(13, 2.5, 4), roofMat);
    roof.position.y = 7.75;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.3, 1.0, 0.85);
    roof.castShadow = true;
    group.add(roof);

    for (let x = -8.5; x <= 8.5; x += 4.2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.5, 8), pillarMat);
      col.position.set(x, 3.25, 5.0);
      col.castShadow = true;
      group.add(col);
    }

    for (let floor = 1.8; floor <= 4.8; floor += 2.8) {
      for (let wx = -8; wx <= 8; wx += 2.8) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.1), windowMat);
        win.position.set(wx, floor, 4.8);
        group.add(win);
      }
    }

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.8, 0.15), greenMat);
    signBoard.position.set(0, 5.2, 4.85);
    group.add(signBoard);

    return group;
  }

  /**
   * Parade Ground Saluting Dais with 3 Flagpoles.
   */
  public static createParadeDais(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ParadeDais';

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.9 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x006622, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x008751, roughness: 0.4 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 6), concreteMat);
    base.position.y = 0.3;
    base.receiveShadow = true;
    group.add(base);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.5, 4.5), concreteMat);
    step2.position.y = 0.85;
    step2.receiveShadow = true;
    group.add(step2);

    for (const [x, z] of [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), goldMat);
      pole.position.set(x, 2.7, z);
      pole.castShadow = true;
      group.add(pole);
    }

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.25, 4.8), canopyMat);
    canopy.position.y = 4.3;
    canopy.castShadow = true;
    group.add(canopy);

    const podium = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6), goldMat);
    podium.position.set(0, 1.65, 1.2);
    podium.castShadow = true;
    group.add(podium);

    [-3.8, 0, 3.8].forEach((fx) => {
      const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 9.0, 8), goldMat);
      flagpole.position.set(fx, 4.5, -3.2);
      flagpole.castShadow = true;
      group.add(flagpole);

      const banner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.04), flagMat);
      banner.position.set(fx + 0.85, 8.2, -3.2);
      group.add(banner);
    });

    return group;
  }

  /**
   * Canteen Mess Hall.
   */
  public static createCanteenBuilding(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CampCanteen';

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x9e382b, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4727, roughness: 0.8 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

    const building = new THREE.Mesh(new THREE.BoxGeometry(15, 5.0, 11), brickMat);
    building.position.y = 2.5;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 2.2, 4), roofMat);
    roof.position.y = 6.1;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 1.0, 0.9);
    roof.castShadow = true;
    group.add(roof);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.8, 0.15), signMat);
    sign.position.set(0, 4.2, 5.6);
    group.add(sign);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.1, 0.6), woodMat);
    counter.position.set(0, 0.55, 5.8);
    counter.castShadow = true;
    group.add(counter);

    return group;
  }

  /**
   * Mami Market Stalls cluster.
   */
  public static createMamiMarket(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'MamiMarket';

    const stallWoodMat = new THREE.MeshStandardMaterial({ color: 0x54361c, roughness: 0.85 });
    const mamaPutStripeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const tailorBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
    const coldDrinksGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });

    const stalls = [
      { name: 'Mama Put Jollof', x: -5, mat: mamaPutStripeMat },
      { name: 'NYSC Tailoring', x: 0, mat: tailorBlueMat },
      { name: 'Cold Pure Water', x: 5, mat: coldDrinksGreenMat }
    ];

    stalls.forEach((stall) => {
      const stallGroup = new THREE.Group();
      stallGroup.position.set(stall.x, 0, 0);

      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.4), stallWoodMat);
      counter.position.y = 0.5;
      counter.castShadow = true;
      stallGroup.add(counter);

      for (const [px, pz] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), stallWoodMat);
        post.position.set(px, 1.3, pz);
        post.castShadow = true;
        stallGroup.add(post);
      }

      const awning = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.0), stall.mat);
      awning.position.set(0, 2.5, 0.1);
      awning.rotation.x = 0.15;
      awning.castShadow = true;
      stallGroup.add(awning);

      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.45), stallWoodMat);
      bench.position.set(0, 0.23, 1.6);
      bench.castShadow = true;
      stallGroup.add(bench);

      group.add(stallGroup);
    });

    return group;
  }

  /**
   * Borehole Water Tap Station.
   */
  public static createBoreholePump(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BoreholeTap';

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.85 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.2 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 });

    const basin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.5), concreteMat);
    basin.position.y = 0.175;
    basin.receiveShadow = true;
    group.add(basin);

    const waterPool = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 1.8), waterMat);
    waterPool.position.set(0, 0.36, 0);
    group.add(waterPool);

    for (const [tx, tz] of [[-1.2, -1.8], [1.2, -1.8], [-1.2, -0.6], [1.2, -0.6]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 8), pipeMat);
      leg.position.set(tx, 2.25, tz);
      leg.castShadow = true;
      group.add(leg);
    }

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 16), tankMat);
    tank.position.set(0, 5.0, -1.2);
    tank.castShadow = true;
    group.add(tank);

    const mainPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 8), pipeMat);
    mainPipe.position.set(0, 2.6, 0);
    group.add(mainPipe);

    const tapBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), pipeMat);
    tapBar.position.set(0, 0.9, 0);
    tapBar.rotation.z = Math.PI / 2;
    group.add(tapBar);

    [-0.7, -0.23, 0.23, 0.7].forEach((tapX) => {
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), brassMat);
      tap.position.set(tapX, 0.8, 0.1);
      tap.rotation.x = Math.PI / 2;
      group.add(tap);
    });

    return group;
  }

  /**
   * Tropical Palm Tree.
   */
  public static createPalmTree(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'PalmTree';

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x593d25, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5, side: THREE.DoubleSide });

    let currentY = 0;
    for (let i = 0; i < 5; i++) {
      const height = 1.2;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - i * 0.02, 0.28 - i * 0.02, height, 8), barkMat);
      seg.position.set(Math.sin(i * 0.2) * 0.25, currentY + height / 2, 0);
      seg.rotation.z = 0.05 * i;
      seg.castShadow = true;
      group.add(seg);
      currentY += height;
    }

    const canopy = new THREE.Group();
    canopy.position.set(0.4, currentY, 0);

    for (let j = 0; j < 8; j++) {
      const angle = (j / 8) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 3.2), leafMat);
      frond.position.set(Math.cos(angle) * 1.5, -0.4, Math.sin(angle) * 1.5);
      frond.rotation.y = angle;
      frond.rotation.x = 0.4;
      frond.castShadow = true;
      canopy.add(frond);
    }

    group.add(canopy);
    return group;
  }

  /**
   * Drill Sergeant NPC.
   */
  public static createDrillSergeant(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'DrillSergeantNPC';

    const camoMat = new THREE.MeshStandardMaterial({ color: 0x3f4f34, roughness: 0.8 });
    const beretMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x542d17, roughness: 0.65 });
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.26), camoMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    group.add(torso);

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.75, 0.24), camoMat);
    legs.position.y = 0.6;
    legs.castShadow = true;
    group.add(legs);

    const boots = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), bootMat);
    boots.position.y = 0.1;
    boots.castShadow = true;
    group.add(boots);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.08, 16), beretMat);
    beret.position.set(0.04, 1.82, 0);
    beret.rotation.z = -0.2;
    beret.castShadow = true;
    group.add(beret);

    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), stickMat);
    stick.position.set(0.28, 1.1, 0.1);
    stick.rotation.x = 0.6;
    stick.castShadow = true;
    group.add(stick);

    return group;
  }
}
