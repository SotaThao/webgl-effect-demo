// smoke-effect.js
// === copy noise2D.glsl vào đây ===
const noise2D = `
// --- paste toàn bộ code noise2D.glsl ---
`;

(function(){
  const canvas = document.getElementById('canvas');
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 10);
  camera.position.z = 2;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);

  const geo = new THREE.PlaneGeometry(2,2,200,200);
  const mat = new THREE.RawShaderMaterial({
    uniforms: {
      u_time:      { value: 0 },
      u_mouse:     { value: new THREE.Vector2() },
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
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float u_time;
      uniform vec2 u_mouse;
      ${noise2D}

      // FBM function
      float fbm(vec2 p){
        float f=0.;
        mat2 m = mat2(1.6,1.2,-1.2,1.6);
        f += .500 * noise(p); p = m * p * 2.02;
        f += .250 * noise(p); p = m * p * 2.03;
        f += .125 * noise(p); p = m * p * 2.01;
        f += .0625* noise(p);
        return f;
      }

      void main(){
        vec2 uv = vUv*2. - 1.;
        float t = u_time*0.1;
        vec2 p  = uv*1.5 + u_mouse*0.5;
        float n  = fbm(p + t);
        float n2 = fbm(p*2. - t*.5);
        float smoke = smoothstep(.3,.7, n*n2);
        vec3 c1 = vec3(.05,.05,.06), c2 = vec3(.6,.6,.7);
        vec3 col = mix(c1, c2, smoke);
        float alpha = smoke * (1. - smoothstep(.8,1., length(uv)));
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true
  });

  scene.add(new THREE.Mesh(geo, mat));

  window.addEventListener('mousemove', e => {
    mat.uniforms.u_mouse.value.set(
      (e.clientX/innerWidth)*2.-1.,
      1.-(e.clientY/innerHeight)*2.
    );
  });

  const clock = new THREE.Clock();
  (function animate(){
    mat.uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();

  window.addEventListener('resize', ()=>{
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
  });
})();
