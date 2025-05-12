// smoke-effect.js

// inline Ashima 2D simplex noise
const noise2D = `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float noise(vec2 v){
  const vec4 C = vec4(0.211324865405187,0.366025403784439,
                      -0.577350269189626,0.024390243902439);
  vec2 i = floor(v + dot(v,C.yy));
  vec2 x0 = v - i + dot(i,C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y+vec3(0.0,i1.y,1.0)) + i.x+vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0*fract(p*C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x+0.5);
  vec3 a0 = x-ox;
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x = a0.x*x0.x + h.x*x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m,g);
}
`;

(function(){
  // scene & camera
  const canvas = document.getElementById('canvas');
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 10);
  camera.position.z = 2;

  // renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setClearColor(0x141414, 1);

  // plane geometry
  const geo = new THREE.PlaneGeometry(2, 2, 200, 200);

  // create three layered materials
  const layers = [];
  const layerConfigs = [
    { scale:1.0, speed:0.05, weight:0.6, color1:[0.8,0.8,0.85], color2:[1,1,1] },
    { scale:1.3, speed:0.08, weight:0.3, color1:[0.6,0.6,0.7], color2:[0.9,0.9,1] },
    { scale:1.6, speed:0.12, weight:0.1, color1:[0.4,0.5,0.6], color2:[0.8,0.85,1] }
  ];

  layerConfigs.forEach(cfg => {
    const mat = new THREE.RawShaderMaterial({
      transparent: true,
      uniforms: {
        u_time:  { value: 0 },
        u_mouse: { value: new THREE.Vector2(0,0) },
        u_scale: { value: cfg.scale },
        u_speed: { value: cfg.speed },
        u_weight:{ value: cfg.weight },
        u_c1:    { value: new THREE.Vector3(...cfg.color1) },
        u_c2:    { value: new THREE.Vector3(...cfg.color2) }
      },
      vertexShader: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 projectionMatrix, modelViewMatrix;
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float u_time, u_speed, u_scale, u_weight;
        uniform vec2 u_mouse;
        uniform vec3 u_c1, u_c2;
        ${noise2D}

        float fbm(vec2 p){
          float f=0.0;
          mat2 m = mat2(1.6,1.2,-1.2,1.6);
          f +=.50*noise(p); p=m*p*2.02;
          f +=.25*noise(p); p=m*p*2.03;
          f +=.125*noise(p); p=m*p*2.01;
          f +=.0625*noise(p);
          return f;
        }

        void main(){
          vec2 uv = vUv*2.0 -1.0;
          // offset by mouse, no auto swirl
          vec2 mo = (u_mouse - 0.5)*2.0;
          vec2 p  = uv*u_scale + mo*0.8 + u_time*u_speed;
          float n = fbm(p);
          float smoke = smoothstep(0.2,0.6,n);
          vec3 col = mix(u_c1, u_c2, smoke);
          float alpha = clamp(smoke * u_weight * (1.0 - smoothstep(0.7,1.0,length(uv))), 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    layers.push(mat);
  });

  // mouse interaction
  window.addEventListener('mousemove', e => {
    const mx = e.clientX / window.innerWidth;
    const my = 1.0 - e.clientY / window.innerHeight;
    layers.forEach(m => m.uniforms.u_mouse.value.set(mx, my));
  });

  // animation
  const clock = new THREE.Clock();
  (function tick(){
    const t = clock.getElapsedTime();
    layers.forEach(m => m.uniforms.u_time.value = t);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  })();

  // resize
  window.addEventListener('resize', ()=>{
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  });
})();
