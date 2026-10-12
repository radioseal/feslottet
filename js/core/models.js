/* Feslottet – model toolkit: build "real" toy-like low-poly models in code from primitives.
   Usage:
     const b = F.M.builder();                      // collects parts
     b.box(w,h,d, color, x,y,z, {ry, rx, rz, name}) // returns the mesh (for animated parts use {name} and b.parts[name])
     b.cyl(rTop,rBot,h, color, x,y,z, {seg, ...})   b.cone(r,h, ...)   b.sphere(r, ...)   b.ico(r, ...)  b.torus(R,r, ...)
     b.add(object3d)                                  // any custom THREE.Object3D
     const g = b.group;                               // THREE.Group, origin at the model's foot point
   Static merge (one draw call): F.M.mergeStatic(group) -> THREE.Mesh with vertex colors.
   Colors: hex numbers or names from F.PAL. */
(function () {
'use strict';
const F = window.F;
F.PAL = {
  stone: 0xf1e8d6, stone2: 0xe2d6bf, stoneDark: 0xc9bca4, roofPink: 0xec7aa8, roofLilac: 0x9d8cf0, roofBlue: 0x6fa8ec,
  wood: 0xa8703f, woodDark: 0x7c5230, woodLight: 0xd6a86a, grass: 0x8ed36c, grassDark: 0x6dbb55, leaf: 0x5ec05c, leaf2: 0x7fd36b,
  blossom: 0xf6a9c8, water: 0x6fcaf0, sand: 0xf3dfae, path: 0xf1dcb0, white: 0xffffff, gold: 0xf5c542, red: 0xe8484f,
  pink: 0xff7fb0, rose: 0xff5d8f, yellow: 0xffd84a, orange: 0xff9a3c, green: 0x4fbf5a, blue: 0x4a90e2, sky: 0x9ad6ff,
  purple: 0xa070e0, lilac: 0xc6a8ff, brown: 0x8a5a33, black: 0x333340, grey: 0x9aa0a8, skin: 0xffd9c0, skin2: 0xe8b48c,
  skin3: 0xa8714a, hairBlond: 0xf3d36b, hairBrown: 0x7a4a2a, hairBlack: 0x2e2a2a, hairRed: 0xd8662e, cream: 0xfff3dc,
  glass: 0xcfefff, crystal: 0x9fe8ff, silver: 0xd8dde6, flame: 0xfff4a0, lamp: 0xffe066,
  // DESIGN §2.2 additions (locked palette)
  mint: 0x9fe6c4, butter: 0xfff0a0, peach: 0xffc8a8, coral: 0xff8a7a, lavender: 0xb9a5f0, teal: 0x5cc8c0, cream2: 0xf7ead0,
  woodRed: 0xc0724a, roofRed: 0xe0606a, roofMint: 0x7fd1b0, hay: 0xf0d070, wool: 0xfaf6f0, snow: 0xf4f8ff, ice: 0xd8f2ff,
  lavField: 0x9b7fd6, soil: 0xb08860, pathStone: 0xe8dcc4, brick: 0xe8a890, navySoft: 0x5a6aa8, jeansBlue: 0x6f94d6,
  leafDark: 0x4aa84e, cherry: 0xff6f91, plum: 0x9c5fb5, honey: 0xf2b632, milk: 0xfdfdf8, steel: 0xc4cad4,
  gem1: 0xff5fa2, gem2: 0x5fd0ff, gem3: 0x8cff7a, skin4: 0x7a4e30, hairGrey: 0xd8d8d8, glowYellow: 0xfff6b0,
};
const col = c => (typeof c === 'string' ? (F.PAL[c] != null ? F.PAL[c] : new THREE.Color(c).getHex()) : c);
F.col = col;

// shared materials per (color, flags)
const matCache = new Map();
F.M = {
  mat(c, o) {
    o = o || {};
    const k = col(c) + '|' + (o.emissive || 0) + '|' + (o.opacity || 1) + '|' + (o.metal || 0) + '|' + (o.smooth ? 1 : 0) + '|' + (o.side || 0);
    let m = matCache.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: col(c), roughness: o.metal ? 0.35 : 0.88, metalness: o.metal || 0, flatShading: !o.smooth,
        emissive: o.emissive ? col(o.emissive) : 0x000000, emissiveIntensity: o.emissive ? (o.ei || 0.6) : 0,
        transparent: (o.opacity || 1) < 1, opacity: o.opacity || 1, side: o.side || THREE.FrontSide });
      matCache.set(k, m);
    }
    return m;
  },
  // geometry cache for common primitives
  geo: (() => {
    const cache = new Map();
    return (kind, ...a) => {
      const k = kind + a.join(',');
      let g = cache.get(k);
      if (!g) {
        switch (kind) {
          case 'box': g = new THREE.BoxGeometry(a[0], a[1], a[2]); break;
          case 'cyl': g = new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] || 10); break;
          case 'cone': g = new THREE.ConeGeometry(a[0], a[1], a[2] || 10); break;
          case 'sphere': g = new THREE.SphereGeometry(a[0], a[1] || 12, a[2] || 9); break;
          case 'ico': g = new THREE.IcosahedronGeometry(a[0], a[1] || 0); break;
          case 'dodeca': g = new THREE.DodecahedronGeometry(a[0], 0); break;
          case 'torus': g = new THREE.TorusGeometry(a[0], a[1], a[2] || 8, a[3] || 16); break;
          case 'circle': g = new THREE.CircleGeometry(a[0], a[1] || 16); break;
          case 'plane': g = new THREE.PlaneGeometry(a[0], a[1]); break;
          case 'oct': g = new THREE.OctahedronGeometry(a[0], 0); break;
          default: throw new Error('geo kind ' + kind);
        }
        cache.set(k, g);
      }
      return g;
    };
  })(),
  builder() {
    const group = new THREE.Group();
    const parts = {};
    const place = (m, x, y, z, o) => {
      m.position.set(x || 0, y || 0, z || 0);
      if (o) {
        if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
        if (o.s) { if (Array.isArray(o.s)) m.scale.set(o.s[0], o.s[1], o.s[2]); else m.scale.setScalar(o.s); }
        if (o.name) { m.name = o.name; parts[o.name] = m; }
        if (o.noShadow) m.castShadow = false;
      }
      (o && o.parent ? o.parent : group).add(m);
      return m;
    };
    const mk = (geo, c, o) => { const m = new THREE.Mesh(geo, F.M.mat(c, o)); m.castShadow = !(o && o.noShadow); m.receiveShadow = true; return m; };
    return {
      group, parts,
      box(w, h, d, c, x, y, z, o) { return place(mk(F.M.geo('box', w, h, d), c, o), x, y, z, o); },
      cyl(rt, rb, h, c, x, y, z, o) { return place(mk(F.M.geo('cyl', rt, rb, h, (o && o.seg) || 10), c, o), x, y, z, o); },
      cone(r, h, c, x, y, z, o) { return place(mk(F.M.geo('cone', r, h, (o && o.seg) || 10), c, o), x, y, z, o); },
      sphere(r, c, x, y, z, o) { return place(mk(F.M.geo('sphere', r, (o && o.seg) || 12, (o && o.seg2) || 9), c, Object.assign({ smooth: true }, o)), x, y, z, o); },
      ico(r, c, x, y, z, o) { return place(mk(F.M.geo('ico', r, (o && o.detail) || 0), c, o), x, y, z, o); },
      dodeca(r, c, x, y, z, o) { return place(mk(F.M.geo('dodeca', r), c, o), x, y, z, o); },
      oct(r, c, x, y, z, o) { return place(mk(F.M.geo('oct', r), c, o), x, y, z, o); },
      torus(R, r, c, x, y, z, o) { return place(mk(F.M.geo('torus', R, r, (o && o.seg) || 8, (o && o.seg2) || 16), c, o), x, y, z, o); },
      disc(r, c, x, y, z, o) { const m = place(mk(F.M.geo('circle', r, (o && o.seg) || 20), c, Object.assign({ side: THREE.DoubleSide }, o)), x, y, z, o); if (!(o && o.rx != null)) m.rotation.x = -Math.PI / 2; return m; },
      plane(w, h, c, x, y, z, o) { return place(mk(F.M.geo('plane', w, h), c, Object.assign({ side: THREE.DoubleSide }, o)), x, y, z, o); },
      // a group used as a pivot for animated sub-assemblies: const lid = b.pivot(x,y,z,{name:'lid'}); b.box(..., {parent: lid})
      pivot(x, y, z, o) { const g = new THREE.Group(); return place(g, x, y, z, o); },
      add(obj, x, y, z, o) { return place(obj, x, y, z, o); },
    };
  },
  // Merge every mesh of a (static) group into one vertex-colored mesh. Keeps world transforms relative to group.
  mergeStatic(group, opts) {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const pos = [], nor = [], colr = [];
    const m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3(), c = new THREE.Color();
    group.traverse(o => {
      if (!o.isMesh || o.material.transparent) return;
      let g = o.geometry; if (g.index) g = g.toNonIndexed();
      m4.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m4);
      c.copy(o.material.color);
      const p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m4); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
        colr.push(c.r, c.g, c.b);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, F.M.vcMat || (F.M.vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true })));
    mesh.castShadow = !(opts && opts.noShadow); mesh.receiveShadow = true;
    return mesh;
  },
};
})();
