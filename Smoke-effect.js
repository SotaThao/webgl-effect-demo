// smoke-effect.js

// === Noise2D Simplex GLSL (Ashima) ===
const noise2D = `
// Ashima 2D Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float noise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  /* (3.0-sqrt(3.0))/6.0 */
                      0.366025403784439,  /* 0.5*(sqrt(3.0)-1.0) */
                     -0.577350269189626,  /* -1.0 + 2.0 * C.x */
                      0.024390243902439); /* 1.0 / 41.0 */
  // First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                 + i.x + vec3(0.0, i1.x, 1.0 ));

  // Gradients
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

// === Main IIFE for Three.js + Shader effect ===
(function(){
  // 1. Setup scene, camera, renderer
  const canvas   = document.getElementById('canvas');
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 10);
  camera.position.z = 2;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // 2. Geometry
  const geo = new THREE.PlaneGeometry(2, 2, 200, 200);

  // 3. Shader material
  const mat = new THREE.RawShaderMaterial({
    uniforms: {
      u_time:  { value: 0 },
      u_mouse: { value: new THREE.Vector2(0,0) }
    },
    vertexShader: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float u_time;
      uniform vec2 u_mouse;

      ${noise2D}

      // Fractal Brownian Motion
      float fbm(vec2 p){
        float f = 0.0;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        f += 0.50  * noise(p);      p = m * p * 2.02;
        f += 0.25  * noise(p);      p = m * p * 2.03;
        f += 0.125 * noise(p);      p = m * p * 2.01;
        f += 0.0625* noise(p);
        return f;
      }

      void main(){
        // Normalize UV to [-1,1]
        vec2 uv = vUv * 2.0 - 1.0;
        float t = u_time * 0.1;
        vec2 p = uv * 1.5 + u_mouse * 0.5;

        // Two layers of noise
        float n1 = fbm(p + t);
        float n2 = fbm(p * 2.0 - t * 0.5);
        float smoke = smoothstep(0.3, 0.7, n1 * n2);

        // Color blend
        vec3 c1 = vec3(0.05, 0.05, 0.06);
        vec3 c2 = vec3(0.6,  0.6,  0.7);
        vec3 col = mix(c1, c2, smoke);

        // Alpha fade at edges
        float alpha = smoke * (1.0 - smoothstep(0.8, 1.0, length(uv)));
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true
  });

  // 4. Add mesh
  scene.add(new THREE.Mesh(geo, mat));

  // 5. Mouse interaction
  window.addEventListener('mousemove', e => {
    mat.uniforms.u_mouse.value.set(
      (e.clientX / window.innerWidth) * 2.0 - 1.0,
      1.0 - (e.clientY / window.innerHeight) * 2.0
    );
  });

  // 6. Animation loop
  const clock = new THREE.Clock();
  (function animate(){
    mat.uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();

  // 7. Handle resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  });
})();
