/* Independently authored: flowing light, staggered type, soft refractive photo reveal. */
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'opening-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false});
  if (!gl) {root.classList.remove('opening-boot'); return;}
  let ended = false, raf = 0;
  const shaders = [];
  let program;
  function finish() {
    root.classList.remove('opening-boot');
    ended = true; cancelAnimationFrame(raf);
    hero.classList.remove('opening-active');
    hero.classList.add('opening-complete');
    canvas.remove();
  }
  function compile(type, text) {
    const s = gl.createShader(type); gl.shaderSource(s,text); gl.compileShader(s);
    if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    shaders.push(s); return s;
  }
  try {
    program = gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,`
      attribute vec2 position; varying vec2 uv;
      void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}
    `));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`
      precision mediump float;
      varying vec2 uv;
      uniform sampler2D photoA; uniform sampler2D photoB;
      uniform float clock; uniform float phase;
      float hash(float x){return fract(sin(x*23.17+4.21)*1537.82);}
      void main(){
        vec2 p=uv*2.-1.;
        float glow=exp(-pow(p.x*8.,2.));
        vec3 dark=vec3(.118,.164,.208)+vec3(.008,.014,.02)*glow;
        float stream=0.;
        for(int i=0;i<52;i++){
          float n=float(i); float x=(hash(n)-.5)*.19;
          float y=fract(uv.y+clock*(.04+hash(n+50.)*.075)+hash(n+100.));
          float bead=pow(max(0.,sin(y*43.982+n)),26.);
          float width=.0012+hash(n+200.)*.0016;
          stream+=exp(-pow((p.x-x)/width,2.))*bead;
        }
        dark+=vec3(.29,.57,.68)*stream*.25*max(0.,1.-clock/6.);
        dark+=vec3(.015,.024,.027)*pow(max(0.,sin(p.x*9.+p.y*.5+clock*.15)),12.);
        float amount=clamp((clock-5.)/3.,0.,1.);
        if(phase>.5) amount=clamp((clock-10.)/3.,0.,1.);
        float distanceFromCenter=length(p);
        float edge=amount*2.05;
        float reveal=1.-smoothstep(edge-.28,edge+.13,distanceFromCenter);
        reveal*=smoothstep(0.,.08,amount);
        if(amount>.995) reveal=1.;
        float envelope=sin(amount*3.14159);
        vec2 direction=p/max(distanceFromCenter,.03);
        vec2 bend=direction*sin(distanceFromCenter*24.-amount*16.)*.008*envelope;
        vec2 sampleUV=clamp(uv+bend,.001,.999);
        vec3 first=texture2D(photoA,sampleUV).rgb;
        vec3 next=texture2D(photoB,sampleUV).rgb;
        vec3 color=phase>.5?mix(first,next,reveal):mix(dark,first,reveal);
        gl_FragColor=vec4(color,1.);
      }
    `));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('opening shader link');
    gl.useProgram(program);
    const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    const textures=[0,1].map(i=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t});
    gl.uniform1i(gl.getUniformLocation(program,'photoA'),0);gl.uniform1i(gl.getUniformLocation(program,'photoB'),1);
    const time=gl.getUniformLocation(program,'clock'),phase=gl.getUniformLocation(program,'phase');
    const pairs=[...hero.querySelectorAll('.hero-pair')];
    function resize(){
      const r=hero.getBoundingClientRect(), scale=Math.min(devicePixelRatio,1.5);
      canvas.width=Math.round(r.width*scale);canvas.height=Math.round(r.height*scale);gl.viewport(0,0,canvas.width,canvas.height);
      pairs.forEach((pair,i)=>{
        const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
        const ctx=surface.getContext('2d');const imgs=[...pair.querySelectorAll('img')];
        imgs.forEach((img,j)=>{
          const w=surface.width/2,h=surface.height;
          const k=Math.max(w/img.naturalWidth,h/img.naturalHeight);
          const style=getComputedStyle(img),position=style.objectPosition.split(' ').map(parseFloat);
          const dx=(w-img.naturalWidth*k)*(position[0]/100),dy=(h-img.naturalHeight*k)*(position[1]/100);
          ctx.save();ctx.beginPath();ctx.rect(j*w,0,w,h);ctx.clip();ctx.drawImage(img,j*w+dx,dy,img.naturalWidth*k,img.naturalHeight*k);ctx.restore();
        });
        gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface);
      });
    }
    const imgs=[...hero.querySelectorAll('.hero-pair img')];
    Promise.all(imgs.map(img=>img.decode())).then(()=>{
      if(ended||reduced.matches||root.classList.contains('motion-off')){finish();return;}
      resize();hero.insertBefore(canvas,hero.querySelector('.hero-shade'));
      hero.classList.add('opening-active');
      root.classList.remove('opening-boot');
      const letters=[...hero.querySelectorAll('.split-line .char')];
      const order=letters.map((_,i)=>i);
      for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      order.forEach((index,rank)=>letters[index].style.setProperty('--opening-delay',(1.5+rank*.1)+'s'));
      hero.style.setProperty('--english-delay',(2.5+(letters.length-1)*.1)+'s');
      const started=performance.now();
      function frame(now){
        if(ended)return;
        const t=(now-started)/1000;
        gl.uniform1f(time,t);gl.uniform1f(phase,t>=10?1:0);gl.drawArrays(gl.TRIANGLES,0,6);
        if(t>=13){finish();return;}raf=requestAnimationFrame(frame);
      }
      raf=requestAnimationFrame(frame);
      addEventListener('resize',()=>{if(!ended)resize()},{passive:true});
    }).catch(finish);
  } catch(error){finish();console.warn('Opening uses static fallback',error.message);}
  new MutationObserver(()=>{if(root.classList.contains('motion-off'))finish()}).observe(root,{attributes:true,attributeFilter:['class']});
  canvas.addEventListener('webglcontextlost',finish);
  reduced.addEventListener('change',e=>{if(e.matches)finish()});
  addEventListener('pagehide',finish,{once:true});
})();

