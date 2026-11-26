import * as THREE from 'three';
import { BodyType, GroundClearance } from '../../types/game';

export interface CarRig3D {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  wheels: THREE.Group[];
  markerGroup?: THREE.Group;
  dotMesh?: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  youSprite?: THREE.Sprite;
  dnfBeacon?: THREE.Mesh;
  wheelRadius: number;
  rearWheelX: number;
  rearWheelZ: number;
  setBraking: (braking: boolean) => void;
  setNightMode: (isNight: boolean) => void;
  dispose: () => void;
}

function createYouBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rx = 18;
    const ry = 14;
    const rw = 220;
    const rh = 72;
    const rad = 36;

    ctx.beginPath();
    ctx.moveTo(rx + rad, ry);
    ctx.lineTo(rx + rw - rad, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
    ctx.lineTo(rx + rad, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rad);
    ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
    ctx.closePath();

    ctx.fillStyle = 'rgba(11, 18, 32, 0.94)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#38BDF8';
    ctx.stroke();

    const dotX = 68;
    const dotY = ry + rh / 2;
    const grad = ctx.createRadialGradient(dotX, dotY, 2, dotX, dotY, 22);
    grad.addColorStop(0, '#E0F2FE');
    grad.addColorStop(0.35, '#38BDF8');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(116, ry + rh + 2);
    ctx.lineTo(140, ry + rh + 2);
    ctx.lineTo(128, ry + rh + 16);
    ctx.closePath();
    ctx.fill();

    ctx.font = '800 38px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText('YOU', 98, dotY + 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);
    ctx.save();
    ctx.translate(64, 128);
    ctx.scale(1, 2.05);
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 56);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.36)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function getClearanceOffset(clearance: GroundClearance, bodyType: BodyType): number {
  const baseByType =
    bodyType === 'SUV' || bodyType === 'Pickup'
      ? 0.42
      : bodyType === 'Rally'
      ? 0.34
      : bodyType === 'Supercar' || bodyType === 'Track'
      ? 0.16
      : 0.24;

  if (clearance === 'High') return Math.max(baseByType, 0.44);
  if (clearance === 'Low') return Math.min(baseByType, 0.17);
  return baseByType;
}

/**
 * Builds a smooth beveled side-profile hull extruded symmetrically along the X axis
 * so cars have sculpted noses, windshields, rooflines, and rear decks instead of plain boxes.
 */
function createSculptedBodyGeometry(
  profilePoints: [number, number][], // [zForward, yHeight]
  width: number,
  bevelSize = 0.06
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(profilePoints[0][0], profilePoints[0][1]);
  for (let i = 1; i < profilePoints.length; i++) {
    shape.lineTo(profilePoints[i][0], profilePoints[i][1]);
  }
  shape.closePath();

  const innerW = Math.max(0.4, width - bevelSize * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerW,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // Extrude runs along +Z; rotate so profile's X becomes world +Z and extrude depth is centered on X=0
  geo.translate(0, 0, -innerW * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createCarModel3D(
  bodyType: BodyType,
  accentColorHex: string,
  groundClearance: GroundClearance,
  isPlayer: boolean
): CarRig3D {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTexs: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposableTexs.push(t);
    return t;
  };

  let safeColor = accentColorHex || (isPlayer ? '#F59E0B' : '#38BDF8');
  if (!safeColor.startsWith('#')) safeColor = isPlayer ? '#F59E0B' : '#38BDF8';

  // Automotive clearcoat metallic paint
  const paintMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(safeColor),
      roughness: 0.24,
      metalness: 0.56,
      clearcoat: 0.92,
      clearcoatRoughness: 0.12,
    })
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.78,
      metalness: 0.18,
    })
  );

  const carbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.42,
      metalness: 0.45,
    })
  );

  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0d1b2a,
      roughness: 0.08,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    })
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbe4ef,
      roughness: 0.18,
      metalness: 0.92,
    })
  );

  const caliperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isPlayer ? 0x38bdf8 : 0xef4444,
      roughness: 0.35,
      metalness: 0.4,
    })
  );

  const tireMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x16181d,
      roughness: 0.9,
      metalness: 0.04,
    })
  );

  const headlightMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
    })
  );

  const taillightMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x881313,
    })
  );

  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const isLarge = bodyType === 'SUV' || bodyType === 'Pickup';
  const isWideLow = bodyType === 'Supercar' || bodyType === 'Track';

  const bodyLen =
    bodyType === 'Hatchback'
      ? 3.92
      : bodyType === 'Pickup'
      ? 4.82
      : bodyType === 'SUV' || bodyType === 'Combi'
      ? 4.5
      : bodyType === 'Supercar' || bodyType === 'Track'
      ? 4.46
      : 4.4;

  const bodyW = isWideLow ? 2.06 : isLarge ? 2.02 : 1.9;
  const wheelRadius = isLarge ? 0.43 : bodyType === 'Rally' ? 0.36 : 0.34;
  const wheelWidth = isWideLow ? 0.33 : isLarge ? 0.31 : 0.25;
  const clearance = getClearanceOffset(groundClearance, bodyType);
  const bodyBaseY = clearance;

  // Grounded radial contact shadow beneath car
  const shadowTex = trackTex(createContactShadowTexture());
  const shadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(bodyW * 1.38, bodyLen * 1.18)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      })
    )
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.035, 0);
  root.add(shadowPlane);

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rotX = 0,
    rotZ = 0
  ) => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, 0, rotZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    chassisGroup.add(mesh);
    return mesh;
  };

  const addSculptedHull = (pts: [number, number][], width: number, bevel = 0.06) => {
    const hull = new THREE.Mesh(trackGeo(createSculptedBodyGeometry(pts, width, bevel)), paintMat);
    hull.castShadow = true;
    hull.receiveShadow = true;
    chassisGroup.add(hull);
    return hull;
  };

  // Dark aero undertray + side rocker skirts
  addBox(bodyW * 0.96, 0.14, bodyLen * 0.96, 0, bodyBaseY + 0.07, 0, trimMat);

  // Sculpted lower + upper silhouette per BodyType
  const hl = bodyLen * 0.5;
  if (bodyType === 'Hatchback') {
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.14],
        [hl - 0.12, bodyBaseY + 0.56],
        [hl * 0.44, bodyBaseY + 0.7],
        [hl * 0.1, bodyBaseY + 1.16],
        [-hl * 0.72, bodyBaseY + 1.16],
        [-hl + 0.08, bodyBaseY + 0.64],
        [-hl, bodyBaseY + 0.16],
      ],
      bodyW,
      0.06
    );
    // Greenhouse glass band + roof wing
    addBox(bodyW * 0.88, 0.36, 1.98, 0, bodyBaseY + 0.92, -0.34, glassMat);
    addBox(bodyW * 0.88, 0.07, 0.28, 0, bodyBaseY + 1.2, -hl + 0.24, carbonMat);
  } else if (bodyType === 'Sedan') {
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.14],
        [hl - 0.1, bodyBaseY + 0.54],
        [hl * 0.36, bodyBaseY + 0.68],
        [hl * 0.04, bodyBaseY + 1.12],
        [-hl * 0.48, bodyBaseY + 1.12],
        [-hl * 0.74, bodyBaseY + 0.72],
        [-hl, bodyBaseY + 0.66],
        [-hl, bodyBaseY + 0.16],
      ],
      bodyW,
      0.06
    );
    addBox(bodyW * 0.87, 0.35, 1.85, 0, bodyBaseY + 0.89, -0.18, glassMat);
    // Subtle trunk lip
    addBox(bodyW * 0.86, 0.05, 0.16, 0, bodyBaseY + 0.7, -hl + 0.1, carbonMat);
  } else if (bodyType === 'Combi') {
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.14],
        [hl - 0.1, bodyBaseY + 0.54],
        [hl * 0.36, bodyBaseY + 0.68],
        [hl * 0.04, bodyBaseY + 1.14],
        [-hl * 0.86, bodyBaseY + 1.12],
        [-hl, bodyBaseY + 0.58],
        [-hl, bodyBaseY + 0.16],
      ],
      bodyW,
      0.06
    );
    addBox(bodyW * 0.87, 0.36, 2.55, 0, bodyBaseY + 0.91, -0.58, glassMat);
    addBox(0.06, 0.07, 2.15, -bodyW * 0.36, bodyBaseY + 1.21, -0.58, chromeMat);
    addBox(0.06, 0.07, 2.15, bodyW * 0.36, bodyBaseY + 1.21, -0.58, chromeMat);
  } else if (bodyType === 'SUV') {
    // Rugged black wheel arch & lower cladding
    addBox(bodyW + 0.08, 0.24, bodyLen * 0.96, 0, bodyBaseY + 0.16, 0, trimMat);
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.2],
        [hl - 0.08, bodyBaseY + 0.74],
        [hl * 0.38, bodyBaseY + 0.84],
        [hl * 0.12, bodyBaseY + 1.44],
        [-hl * 0.84, bodyBaseY + 1.44],
        [-hl, bodyBaseY + 0.76],
        [-hl, bodyBaseY + 0.2],
      ],
      bodyW,
      0.07
    );
    addBox(bodyW * 0.88, 0.44, 2.48, 0, bodyBaseY + 1.15, -0.42, glassMat);
    // Silver roof rack & front skidplate
    addBox(0.07, 0.08, 2.05, -bodyW * 0.36, bodyBaseY + 1.52, -0.45, chromeMat);
    addBox(0.07, 0.08, 2.05, bodyW * 0.36, bodyBaseY + 1.52, -0.45, chromeMat);
    addBox(bodyW * 0.65, 0.16, 0.1, 0, bodyBaseY + 0.18, hl + 0.02, chromeMat, -0.25);
  } else if (bodyType === 'Coupe') {
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.12],
        [hl - 0.16, bodyBaseY + 0.48],
        [hl * 0.28, bodyBaseY + 0.62],
        [-0.08, bodyBaseY + 1.04],
        [-hl * 0.48, bodyBaseY + 1.0],
        [-hl * 0.82, bodyBaseY + 0.66],
        [-hl, bodyBaseY + 0.62],
        [-hl, bodyBaseY + 0.14],
      ],
      bodyW,
      0.06
    );
    addBox(bodyW * 0.84, 0.31, 1.72, 0, bodyBaseY + 0.81, -0.24, glassMat);
    addBox(bodyW * 0.9, 0.07, 0.2, 0, bodyBaseY + 0.68, -hl + 0.14, carbonMat, -0.25);
  } else if (bodyType === 'Supercar') {
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.1],
        [hl - 0.24, bodyBaseY + 0.36],
        [hl * 0.38, bodyBaseY + 0.52],
        [0.32, bodyBaseY + 0.86],
        [-0.44, bodyBaseY + 0.85],
        [-hl * 0.72, bodyBaseY + 0.58],
        [-hl, bodyBaseY + 0.54],
        [-hl, bodyBaseY + 0.12],
      ],
      bodyW,
      0.05
    );
    // Front splitter & side aero blades
    addBox(bodyW + 0.12, 0.05, 0.36, 0, bodyBaseY + 0.08, hl - 0.05, carbonMat);
    addBox(bodyW * 0.78, 0.28, 1.65, 0, bodyBaseY + 0.66, 0.1, glassMat);
    addBox(0.11, 0.26, 1.15, -bodyW * 0.51, bodyBaseY + 0.34, -0.35, carbonMat);
    addBox(0.11, 0.26, 1.15, bodyW * 0.51, bodyBaseY + 0.34, -0.35, carbonMat);
    // Engine deck louvers + carbon rear wing
    addBox(bodyW * 0.7, 0.08, 1.05, 0, bodyBaseY + 0.62, -1.25, carbonMat);
    addBox(bodyW * 0.96, 0.06, 0.34, 0, bodyBaseY + 0.86, -hl + 0.12, carbonMat);
    addBox(0.06, 0.28, 0.16, -0.58, bodyBaseY + 0.68, -hl + 0.15, carbonMat);
    addBox(0.06, 0.28, 0.16, 0.58, bodyBaseY + 0.68, -hl + 0.15, carbonMat);
  } else if (bodyType === 'Rally') {
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.14],
        [hl - 0.12, bodyBaseY + 0.56],
        [hl * 0.38, bodyBaseY + 0.7],
        [hl * 0.06, bodyBaseY + 1.14],
        [-hl * 0.65, bodyBaseY + 1.14],
        [-hl + 0.1, bodyBaseY + 0.68],
        [-hl, bodyBaseY + 0.16],
      ],
      bodyW,
      0.06
    );
    addBox(bodyW * 0.86, 0.35, 1.92, 0, bodyBaseY + 0.91, -0.22, glassMat);
    // Roof scoop + rally wing + 4-lamp front pod
    addBox(0.38, 0.11, 0.48, 0, bodyBaseY + 1.22, 0.1, trimMat);
    addBox(bodyW * 0.94, 0.07, 0.34, 0, bodyBaseY + 1.16, -hl + 0.14, paintMat);
    addBox(0.07, 0.45, 0.22, -bodyW * 0.38, bodyBaseY + 0.92, -hl + 0.14, paintMat);
    addBox(0.07, 0.45, 0.22, bodyW * 0.38, bodyBaseY + 0.92, -hl + 0.14, paintMat);
    // Rally light pod
    addBox(0.96, 0.14, 0.18, 0, bodyBaseY + 0.66, hl - 0.16, trimMat);
    addBox(0.18, 0.11, 0.06, -0.32, bodyBaseY + 0.66, hl - 0.07, headlightMat);
    addBox(0.18, 0.11, 0.06, -0.1, bodyBaseY + 0.66, hl - 0.07, headlightMat);
    addBox(0.18, 0.11, 0.06, 0.1, bodyBaseY + 0.66, hl - 0.07, headlightMat);
    addBox(0.18, 0.11, 0.06, 0.32, bodyBaseY + 0.66, hl - 0.07, headlightMat);
  } else if (bodyType === 'Pickup') {
    // High truck nose + crew cab + open cargo bed
    addBox(bodyW, 0.64, 2.75, 0, bodyBaseY + 0.5, 0.96, paintMat);
    addBox(bodyW * 0.88, 0.54, 1.56, 0, bodyBaseY + 1.08, 0.36, glassMat);
    addBox(bodyW * 0.89, 0.09, 1.42, 0, bodyBaseY + 1.38, 0.31, paintMat);
    addBox(bodyW, 0.24, 1.98, 0, bodyBaseY + 0.3, -1.36, paintMat);
    addBox(0.14, 0.42, 1.98, -bodyW * 0.44, bodyBaseY + 0.6, -1.36, paintMat);
    addBox(0.14, 0.42, 1.98, bodyW * 0.44, bodyBaseY + 0.6, -1.36, paintMat);
    addBox(bodyW, 0.42, 0.14, 0, bodyBaseY + 0.6, -2.28, paintMat);
    addBox(bodyW * 0.72, 0.06, 1.78, 0, bodyBaseY + 0.44, -1.33, trimMat);
    // Chrome rollbar
    addBox(0.08, 0.46, 0.08, -bodyW * 0.38, bodyBaseY + 1.0, -0.58, chromeMat);
    addBox(0.08, 0.46, 0.08, bodyW * 0.38, bodyBaseY + 1.0, -0.58, chromeMat);
    addBox(bodyW * 0.78, 0.08, 0.08, 0, bodyBaseY + 1.24, -0.58, chromeMat);
  } else {
    // 'Track' endurance prototype / GT3 racer
    addSculptedHull(
      [
        [hl, bodyBaseY + 0.1],
        [hl - 0.2, bodyBaseY + 0.36],
        [hl * 0.34, bodyBaseY + 0.5],
        [0.24, bodyBaseY + 0.84],
        [-0.4, bodyBaseY + 0.84],
        [-hl * 0.78, bodyBaseY + 0.56],
        [-hl, bodyBaseY + 0.52],
        [-hl, bodyBaseY + 0.12],
      ],
      bodyW,
      0.05
    );
    addBox(bodyW + 0.2, 0.06, 0.48, 0, bodyBaseY + 0.09, hl - 0.02, carbonMat);
    addBox(bodyW * 0.76, 0.28, 1.54, 0, bodyBaseY + 0.64, 0.08, glassMat);
    // Tall swan-neck GT rear wing + rear diffuser
    addBox(bodyW + 0.18, 0.06, 0.42, 0, bodyBaseY + 1.1, -hl + 0.08, carbonMat);
    addBox(0.06, 0.64, 0.16, -0.58, bodyBaseY + 0.78, -hl + 0.1, carbonMat);
    addBox(0.06, 0.64, 0.16, 0.58, bodyBaseY + 0.78, -hl + 0.1, carbonMat);
  }

  // Side mirrors
  const mirrorY = isLarge ? bodyBaseY + 0.92 : bodyBaseY + 0.7;
  addBox(0.16, 0.09, 0.14, -bodyW * 0.53, mirrorY, 0.45, paintMat);
  addBox(0.16, 0.09, 0.14, bodyW * 0.53, mirrorY, 0.45, paintMat);

  // Front grille + aggressive intake + LED headlights (+Z)
  addBox(bodyW * 0.52, 0.18, 0.08, 0, bodyBaseY + 0.3, hl + 0.01, trimMat);
  addBox(0.38, 0.11, 0.08, -bodyW * 0.33, bodyBaseY + 0.38, hl + 0.01, headlightMat);
  addBox(0.38, 0.11, 0.08, bodyW * 0.33, bodyBaseY + 0.38, hl + 0.01, headlightMat);

  // Rear diffuser, dual chrome exhausts & LED taillights (-Z)
  addBox(bodyW * 0.74, 0.13, 0.12, 0, bodyBaseY + 0.16, -hl - 0.01, carbonMat);
  addBox(0.09, 0.09, 0.16, -0.44, bodyBaseY + 0.17, -hl - 0.03, chromeMat);
  addBox(0.09, 0.09, 0.16, 0.44, bodyBaseY + 0.17, -hl - 0.03, chromeMat);
  addBox(0.46, 0.11, 0.08, -bodyW * 0.31, bodyBaseY + 0.44, -hl - 0.01, taillightMat);
  addBox(0.46, 0.11, 0.08, bodyW * 0.31, bodyBaseY + 0.44, -hl - 0.01, taillightMat);
  // Center 3rd brake light strip
  addBox(0.48, 0.05, 0.07, 0, bodyBaseY + (isLarge ? 1.42 : 0.72), -hl + 0.1, taillightMat);

  // 4 rotating multi-part wheels (tire + brushed alloy rim + spoke bar + brake caliper)
  const wheelGeo = trackGeo(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20));
  wheelGeo.rotateZ(Math.PI / 2);

  const rimGeo = trackGeo(
    new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, wheelWidth + 0.02, 16)
  );
  rimGeo.rotateZ(Math.PI / 2);

  const spokeGeo = trackGeo(
    new THREE.BoxGeometry(wheelWidth + 0.035, wheelRadius * 1.1, wheelRadius * 0.16)
  );
  const spokeGeo2 = trackGeo(
    new THREE.BoxGeometry(wheelWidth + 0.035, wheelRadius * 0.16, wheelRadius * 1.1)
  );
  const caliperGeo = trackGeo(
    new THREE.BoxGeometry(wheelWidth * 0.6, wheelRadius * 0.36, wheelRadius * 0.3)
  );

  const wheelOffsetX = bodyW * 0.49 - wheelWidth * 0.2;
  const frontWheelZ = bodyLen * 0.31;
  const rearWheelZ = -bodyLen * 0.31;

  const wheelPositions: [number, number, number][] = [
    [-wheelOffsetX, wheelRadius, frontWheelZ],
    [wheelOffsetX, wheelRadius, frontWheelZ],
    [-wheelOffsetX, wheelRadius, rearWheelZ],
    [wheelOffsetX, wheelRadius, rearWheelZ],
  ];

  const wheels: THREE.Group[] = [];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    const spokeA = new THREE.Mesh(spokeGeo, trimMat);
    const spokeB = new THREE.Mesh(spokeGeo2, trimMat);
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(wx > 0 ? -0.02 : 0.02, 0.04, -wheelRadius * 0.25);

    wheelGroup.add(tire, rim, spokeA, spokeB, caliper);
    root.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  // Player glowing blue dot + floating "YOU" badge above roof
  let markerGroup: THREE.Group | undefined;
  let dotMesh: THREE.Mesh | undefined;
  let haloMesh: THREE.Mesh | undefined;
  let youSprite: THREE.Sprite | undefined;

  if (isPlayer) {
    markerGroup = new THREE.Group();
    const topHeight = bodyType === 'SUV' || bodyType === 'Pickup' ? 2.58 : 2.24;
    markerGroup.position.set(0, topHeight, 0);

    const dotGeo = trackGeo(new THREE.SphereGeometry(0.3, 18, 14));
    const dotMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
      })
    );
    dotMesh = new THREE.Mesh(dotGeo, dotMat);
    markerGroup.add(dotMesh);

    const haloGeo = trackGeo(new THREE.SphereGeometry(0.52, 16, 12));
    const haloMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      })
    );
    haloMesh = new THREE.Mesh(haloGeo, haloMat);
    markerGroup.add(haloMesh);

    const youTex = trackTex(createYouBadgeTexture());
    const spriteMat = trackMat(
      new THREE.SpriteMaterial({
        map: youTex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
    );
    youSprite = new THREE.Sprite(spriteMat);
    youSprite.position.set(0, 1.15, 0);
    youSprite.scale.set(3.2, 1.4, 1);
    youSprite.renderOrder = 20;
    markerGroup.add(youSprite);

    root.add(markerGroup);
  }

  // DNF warning diamond
  const dnfGeo = trackGeo(new THREE.OctahedronGeometry(0.45, 0));
  const dnfMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.9,
    })
  );
  const dnfBeacon = new THREE.Mesh(dnfGeo, dnfMat);
  dnfBeacon.position.set(0, 2.35, 0);
  dnfBeacon.visible = false;
  root.add(dnfBeacon);

  // Nighttime headlight beams
  const beamGeo = trackGeo(new THREE.ConeGeometry(2.3, 14, 16, 1, true));
  beamGeo.translate(0, -7, 0);
  beamGeo.rotateX(Math.PI / 2);

  const beamGroup = new THREE.Group();
  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(-bodyW * 0.31, bodyBaseY + 0.36, hl);
  leftBeam.rotation.x = 0.08;
  const rightBeam = new THREE.Mesh(beamGeo, beamMat);
  rightBeam.position.set(bodyW * 0.31, bodyBaseY + 0.36, hl);
  rightBeam.rotation.x = 0.08;
  beamGroup.add(leftBeam, rightBeam);
  beamGroup.visible = false;
  chassisGroup.add(beamGroup);

  const setBraking = (braking: boolean) => {
    taillightMat.color.setHex(braking ? 0xff2b2b : 0x881313);
  };

  const setNightMode = (isNight: boolean) => {
    beamGroup.visible = isNight;
    headlightMat.color.setHex(isNight ? 0xffffff : 0xfef9c3);
  };

  const dispose = () => {
    disposableGeos.forEach((g) => g.dispose());
    disposableMats.forEach((m) => m.dispose());
    disposableTexs.forEach((t) => t.dispose());
  };

  return {
    root,
    chassisGroup,
    wheels,
    markerGroup,
    dotMesh,
    haloMesh,
    youSprite,
    dnfBeacon,
    wheelRadius,
    rearWheelX: wheelOffsetX,
    rearWheelZ,
    setBraking,
    setNightMode,
    dispose,
  };
}
