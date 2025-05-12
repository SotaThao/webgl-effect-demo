import noise2D from './noise2D.glsl';

(() => {
  // 1. Khởi tạo scene, camera, renderer
  const canvas = document.getElementById('canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 10);
  camera.position.z = 2;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);

  // 2. PlaneGeometry subdivided cao
  const geo = new THREE.PlaneGeometry(2, 2, 200, 200);

  // 3. ShaderMaterial tuỳ chỉnh volumetric smoke
  const mat = new THREE.RawShaderMaterial({
    uniforms: {
      u_time:      { value: 0.0 },
      u_resolution:{ value: new THREE.Vector2(innerWidth, innerHeight) },
      u_mouse:     { value: new THREE.Vector2(0,0) }
    },
    vertexShader: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      #version 300 es
      precision highp float;
      #define PI 3.14159265359

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      varying vec2 vUv;

      // Import noise2D
      ${noise2D}

      // Fractal Brownian Motion
      float fbm(vec2 p) {
        float f = 0.0;
        mat2 m = mat2(1.6,1.2,-1.2,1.6);
        f += 0.5000 * noise(p);      p = m * p * 2.02;
        f += 0.2500 * noise(p);      p = m * p * 2.03;
        f += 0.1250 * noise(p);      p = m * p * 2.01;
        f += 0.0625 * noise(p);
        return f;
      }

      void main() {
        // Tọa độ từ -1..1
        vec2 uv = vUv * 2.0 - 1.0;
        // Di chuyển noise theo thời gian và chuột
        vec2 p = uv * 1.5 + u_mouse * 0.5;
        float t = u_time * 0.1;
        // Tạo nhiều octaves smoke
        float n = fbm(p + t);
        float n2 = fbm(p * 2.0 - t * 0.5);
        // Blend 2 lớp noise
        float smoke = smoothstep(0.3, 0.7, n * n2);
        // Tạo gradient màu khói
        vec3 c1 = vec3(0.05, 0.05, 0.06);
        vec3 c2 = vec3(0.6, 0.6, 0.7);
        vec3 color = mix(c1, c2, smoke);
        // Tính alpha fade ở mép
        float dist = length(uv);
        float alpha = (1.0 - smoothstep(0.8, 1.0, dist)) * smoke;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true
  });

  // 4. Mesh + add to scene
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // 5. Bắt sự kiện chuột để tương tác
  window.addEventListener('mousemove', e => {
    mat.uniforms.u_mouse.value.x = ( e.clientX / innerWidth ) * 2.0 - 1.0;
    mat.uniforms.u_mouse.value.y = 1.0 - ( e.clientY / innerHeight ) * 2.0;
  });

  // 6. Animate loop
  const clock = new THREE.Clock();
  function animate() {
    mat.uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // 7. Responsive
  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    mat.uniforms.u_resolution.value.set(innerWidth, innerHeight);
  });
})();
