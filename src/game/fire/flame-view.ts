import * as THREE from 'three';
import { FIRE_VISUAL as V, type FireVisualSurface } from './fire-visual-config';

interface Tongue { x:number;y:number;z:number;height:number;width:number;phase:number;speed:number;angle:number;valid:boolean; }
const profile=V.widthProfile;
const noise=(seed:number)=>{const value=Math.sin(seed*91.17+17.3)*43758.54;return value-Math.floor(value);};

/** One draw call per focus: curved tapered sheets crossed in three directions, never billboards. */
export class FlameView {
  readonly object:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  readonly anchors:Tongue[]=[];
  private readonly positions:Float32Array;
  private readonly strengths:Float32Array;
  private readonly ground:Float32Array;
  private elapsed=0;
  private fraction=1;
  visibleTongueCount=0;
  groundCenterY=0;
  constructor(origin:THREE.Vector3,critical=false,intensity=1,surface?:FireVisualSurface) {
    const count=critical?V.criticalTongues:V.commonTongues, rows=V.heightSegments+1, vertices=count*V.crossedPlanes*rows*3;
    const uvs=new Float32Array(vertices*2),indices:number[]=[];
    this.positions=new Float32Array(vertices*3);this.strengths=new Float32Array(vertices);this.ground=new Float32Array(count*V.crossedPlanes*3);
    const scale=(critical?V.criticalScale:1)*Math.sqrt(Math.max(.3,intensity));
    const seed=origin.x*.73+origin.z*1.17;
    for(let i=0;i<count;i++) {
      const angle=i*2.39996+seed, radius=i===0?0:V.spread*Math.sqrt(i/count);
      const width=V.width*scale*(.7+noise(i+23+seed)*.5),clearance=Math.max(V.obstacleMargin,width*1.1);
      let x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,valid=!surface?.canBurnAt||surface.canBurnAt(origin.x+x,origin.z+z,clearance);
      for(let attempt=0;!valid&&attempt<40;attempt++) {
        const r=.15+attempt/39*(V.maxVisualOffset-.15),a=angle+attempt*2.39996;
        x=Math.cos(a)*r;z=Math.sin(a)*r;valid=surface!.canBurnAt!(origin.x+x,origin.z+z,clearance);
      }
      const y=(surface?surface.terrainHeight(origin.x+x,origin.z+z)-origin.y:0)+V.baseClearance;
      this.anchors.push({x,y,z,height:V.height*scale*(.64+noise(i+9+seed)*.58),width,phase:noise(i+31+seed)*Math.PI*2,speed:V.animationSpeed*(.8+noise(i+44+seed)*.4),angle,valid});
      this.groundCenterY+=y/count;
      for(let plane=0;plane<V.crossedPlanes;plane++) {
        const a=angle+plane*Math.PI/V.crossedPlanes;
        for(let col=0;col<3;col++) {
          const bx=x+Math.cos(a)*(col-1)*this.anchors[i].width*profile[0],bz=z+Math.sin(a)*(col-1)*this.anchors[i].width*profile[0];
          this.ground[(i*V.crossedPlanes+plane)*3+col]=surface?surface.terrainHeight(origin.x+bx,origin.z+bz)-origin.y+V.baseClearance:V.baseClearance;
        }
        for(let row=0;row<rows;row++)for(let col=0;col<3;col++) {
          const n=((i*V.crossedPlanes+plane)*rows+row)*3+col;uvs[n*2]=col/2;uvs[n*2+1]=row/V.heightSegments;
          if(row<V.heightSegments&&col<2)indices.push(n,n+3,n+1,n+1,n+3,n+4);
        }
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setIndex(indices);
    geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('strength',new THREE.BufferAttribute(this.strengths,1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
    const material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.NormalBlending,fog:true,
      uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),opacity:{value:V.opacity},red:{value:new THREE.Color(V.red)},orange:{value:new THREE.Color(V.orange)},yellow:{value:new THREE.Color(V.yellow)}},
      vertexShader:`attribute float strength; varying vec2 flameUv; varying float flameStrength;
        #include <fog_pars_vertex>
        void main(){flameUv=uv;flameStrength=strength;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader:`uniform float opacity;uniform vec3 red;uniform vec3 orange;uniform vec3 yellow;varying vec2 flameUv;varying float flameStrength;
        #include <fog_pars_fragment>
        void main(){float edge=abs(flameUv.x*2.0-1.0);float alpha=(1.0-smoothstep(.62,1.0,edge))*smoothstep(0.0,.07,flameUv.y);
        alpha*=opacity*flameStrength*(1.0-smoothstep(.65,1.0,flameUv.y));if(alpha<.012)discard;
        float core=pow(max(0.0,1.0-edge),2.0)*(1.0-smoothstep(.12,.85,flameUv.y));vec3 color=mix(red,orange,.35+.6*(1.0-flameUv.y));color=mix(color,yellow,core*.88);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        }`,
    });
    this.object=new THREE.Mesh(geometry,material);this.object.name='flame-tongues';
    geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,V.height,0),V.maxVisualOffset+V.height*scale*2.5);
    this.update(0,1);
  }
  get displayFraction():number{return this.fraction;}
  update(delta:number,targetFraction:number,windX=0,windZ=0):void {
    this.elapsed+=delta;
    this.fraction=THREE.MathUtils.lerp(this.fraction,Math.max(0,Math.min(1,targetFraction)),1-Math.exp(-V.response*delta));
    const heightScale=Math.sqrt(this.fraction);this.visibleTongueCount=0;
    const rows=V.heightSegments+1;
    for(let i=0;i<this.anchors.length;i++) {
      const p=this.anchors[i], time=this.elapsed*p.speed+p.phase;
      const strength=p.valid?THREE.MathUtils.clamp((this.fraction-i/this.anchors.length*.55)/.2,0,1):0;
      if(strength>.01)this.visibleTongueCount++;
      const rise=(.91+.07*Math.sin(time*1.3)+.025*Math.sin(time*2.1));
      for(let plane=0;plane<V.crossedPlanes;plane++) {
        const angle=p.angle+plane*Math.PI/V.crossedPlanes,cos=Math.cos(angle),sin=Math.sin(angle);
        for(let row=0;row<rows;row++) {
          const t=row/V.heightSegments,bend=t*t;
          const dx=(Math.sin(time-t*3.8)*V.sway+THREE.MathUtils.clamp(windX,-2,2)*V.windLean)*bend;
          const dz=(Math.cos(time*.83-t*3.2)*V.sway+THREE.MathUtils.clamp(windZ,-2,2)*V.windLean)*bend;
          const profileIndex=t*(profile.length-1), low=Math.floor(profileIndex);
          const width=p.width*THREE.MathUtils.lerp(profile[low],profile[Math.min(low+1,profile.length-1)],profileIndex-low)*(1+.08*Math.sin(time-t*2));
          for(let col=0;col<3;col++) {
            const n=((i*V.crossedPlanes+plane)*rows+row)*3+col,offset=(col-1)*(row===0?p.width*profile[0]:width);
            this.positions[n*3]=p.x+cos*offset+dx;this.positions[n*3+1]=this.ground[(i*V.crossedPlanes+plane)*3+col]+t*p.height*heightScale*rise;
            this.positions[n*3+2]=p.z+sin*offset+dz;this.strengths[n]=strength;
          }
        }
      }
    }
    this.object.material.uniforms.opacity.value=V.opacity*Math.sqrt(this.fraction);
    this.object.geometry.attributes.position.needsUpdate=true;this.object.geometry.attributes.strength.needsUpdate=true;
    this.object.visible=this.fraction>.0001;
  }
}
