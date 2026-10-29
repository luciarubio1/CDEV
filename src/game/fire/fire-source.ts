import * as THREE from 'three';
import { GAME_BALANCE } from '../balance-config';
import { FlameView } from './flame-view';
import { FIRE_VISUAL as V, type FireVisualSurface } from './fire-visual-config';

export interface FireSourceOptions {
  position: THREE.Vector3;
  intensity?: number;
  kind?: 'common' | 'critical';
  surface?: FireVisualSurface;
}
export interface FireWind { direction:THREE.Vector3; intensity:number; }
interface FireParticle { sprite:THREE.Sprite; origin:THREE.Vector3; phase:number; speed:number; rise:number; }
interface ImpactParticle { sprite:THREE.Sprite; velocity:THREE.Vector3; life:number; }
export const FIRE_WATER_SPLASH_PARTICLE_COUNT=14;
export const FIRE_WATER_SMOKE_DURATION=.75;
const textures=new Map<string,THREE.CanvasTexture>();
function particleTexture(center:string,edge:string):THREE.CanvasTexture {
  const key=center+edge,cached=textures.get(key);if(cached)return cached;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const context=canvas.getContext('2d');if(!context)throw new Error('No se pudo crear la textura procedural del incendio.');
  const gradient=context.createRadialGradient(64,64,2,64,64,60);gradient.addColorStop(0,center);gradient.addColorStop(.3,center);gradient.addColorStop(1,edge);
  context.fillStyle=gradient;context.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.set(key,texture);return texture;
}

/** Logical intensity/resistance remain independent of the deformable visual and its short finish tail. */
export class FireSource {
  readonly object=new THREE.Group();
  private readonly flames:FlameView;
  private readonly smoke:FireParticle[]=[];
  private readonly waterSplashes:ImpactParticle[]=[];
  private readonly waterMist:ImpactParticle[]=[];
  private readonly embers:THREE.Points<THREE.BufferGeometry,THREE.PointsMaterial>;
  private readonly emberPositions:Float32Array;
  private readonly emberPhases:number[]=[];
  private readonly light:THREE.PointLight;
  private readonly impactCenter=new THREE.Vector3();
  private intensity:number;
  private readonly initialIntensity:number;
  private readonly initialResistance:number;
  private resistance:number;
  private elapsed=0;
  private visualElapsed=0;
  private tail=0;
  private waterImpactTime=0;
  private nextSplash=0;
  private nextMist=0;
  private active=true;
  get intensityValue():number{return this.intensity;}
  get startingIntensity():number{return this.initialIntensity;}
  get activeDuration():number{return this.elapsed;}
  get isActive():boolean{return this.active;}
  get remainingResistance():number{return this.resistance;}
  get extinguishProgress():number{return 1-this.resistance/this.initialResistance;}

  constructor(options:FireSourceOptions) {
    this.intensity=options.intensity??1;this.initialIntensity=this.intensity;
    this.initialResistance=GAME_BALANCE.fire.waterResistance[options.kind??'common'];this.resistance=this.initialResistance;
    this.object.name='fire-source';this.object.position.copy(options.position);
    this.flames=new FlameView(options.position,options.kind==='critical',this.initialIntensity,options.surface);this.object.add(this.flames.object);
    const validAnchors=this.flames.anchors.filter((point)=>point.valid);
    const anchor=validAnchors[0]??this.flames.anchors[0];this.impactCenter.set(anchor.x,anchor.y,anchor.z);
    const smokeMap=particleTexture('rgba(174,172,165,.55)','rgba(95,96,91,0)');
    const waterMap=particleTexture('rgba(228,250,255,.95)','rgba(139,217,255,0)');
    const mistMap=particleTexture('rgba(232,238,238,.58)','rgba(170,181,183,0)');
    for(let i=0;i<V.smokeCount;i++) {
      const anchor=validAnchors[i%Math.max(1,validAnchors.length)]??this.flames.anchors[0];
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeMap,transparent:true,depthWrite:false,opacity:0,color:i%2?V.smokeDark:V.smokeLight}));
      const origin=new THREE.Vector3(anchor.x,anchor.y+V.smokeStartHeight+Math.random()*.4,anchor.z);
      sprite.position.copy(origin);sprite.scale.setScalar(1+Math.random()*.5);sprite.name='fire-smoke';this.object.add(sprite);
      this.smoke.push({sprite,origin,phase:Math.random()*Math.PI*2,speed:.25+Math.random()*.25,rise:.28+Math.random()*.15});
    }
    for(let i=0;i<FIRE_WATER_SPLASH_PARTICLE_COUNT;i++) {
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:waterMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
      sprite.name='water-splash';sprite.visible=false;this.object.add(sprite);this.waterSplashes.push({sprite,velocity:new THREE.Vector3(),life:0});
    }
    for(let i=0;i<8;i++) {
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:mistMap,transparent:true,depthWrite:false,opacity:.45}));
      sprite.name='water-mist';sprite.visible=false;this.object.add(sprite);this.waterMist.push({sprite,velocity:new THREE.Vector3(),life:0});
    }
    this.emberPositions=new Float32Array(V.emberCount*3);
    for(let i=0;i<V.emberCount;i++){
      this.emberPositions[i*3]=this.impactCenter.x+(Math.random()-.5)*.8;this.emberPositions[i*3+1]=this.impactCenter.y+.2+Math.random()*2;
      this.emberPositions[i*3+2]=this.impactCenter.z+(Math.random()-.5)*.8;this.emberPhases.push(Math.random()*Math.PI*2);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.emberPositions,3).setUsage(THREE.DynamicDrawUsage));
    this.embers=new THREE.Points(geometry,new THREE.PointsMaterial({color:V.emberColor,size:V.emberSize,transparent:true,opacity:.7,
      map:particleTexture('rgba(255,179,51,.95)','rgba(255,132,29,0)'),alphaTest:.04,blending:THREE.NormalBlending,depthWrite:false}));
    this.embers.name='fire-embers';this.embers.frustumCulled=false;this.object.add(this.embers);
    this.light=new THREE.PointLight(V.lightColor,V.lightIntensity*this.intensity,V.lightDistance,2);
    this.light.name='fire-light';this.light.position.copy(this.impactCenter);this.light.position.y+=V.lightHeight;this.object.add(this.light);
  }
  extinguish(amount:number):void {
    if(!this.active)return;
    this.resistance=Math.max(0,this.resistance-Math.max(0,amount));if(this.resistance<1e-10)this.resistance=0;
    this.intensity=this.initialIntensity*this.resistance/this.initialResistance;
    this.light.intensity=V.lightIntensity*this.intensity;
    if(this.resistance===0){this.active=false;this.tail=V.finishTailSeconds;this.light.intensity=0;}
  }
  applyWaterImpact():void {
    if(!this.active)return;
    this.waterImpactTime=FIRE_WATER_SMOKE_DURATION;
    for(let i=0;i<3;i++){
      const particle=this.waterSplashes[this.nextSplash++%this.waterSplashes.length];particle.life=.32+Math.random()*.16;
      particle.sprite.position.set(this.impactCenter.x+(Math.random()-.5)*.6,this.impactCenter.y+.65+Math.random()*.5,this.impactCenter.z+(Math.random()-.5)*.6);
      particle.velocity.set((Math.random()-.5)*1.5,1.1+Math.random()*.8,(Math.random()-.5)*1.5);particle.sprite.visible=true;
    }
    for(let i=0;i<2;i++){
      const particle=this.waterMist[this.nextMist++%this.waterMist.length];particle.life=FIRE_WATER_SMOKE_DURATION;
      particle.sprite.position.set(this.impactCenter.x+(Math.random()-.5)*.5,this.impactCenter.y+.8+Math.random()*.35,this.impactCenter.z+(Math.random()-.5)*.5);
      particle.velocity.set((Math.random()-.5)*.2,.7+Math.random()*.25,(Math.random()-.5)*.2);particle.sprite.visible=true;
    }
  }
  update(delta:number,wind?:FireWind):void {
    if(!this.active&&this.tail<=0){this.object.visible=false;return;}
    this.object.visible=true;this.visualElapsed+=delta;
    if(this.active)this.elapsed+=delta;else this.tail=Math.max(0,this.tail-delta);
    const fraction=this.resistance/this.initialResistance,windX=(wind?.direction.x??0)*(wind?.intensity??0),windZ=(wind?.direction.z??0)*(wind?.intensity??0);
    this.flames.update(delta,fraction,windX,windZ);
    const flicker=.93+Math.sin(this.visualElapsed*7.7)*.045+Math.sin(this.visualElapsed*11.1+.8)*.025;
    this.light.intensity=this.active?V.lightIntensity*this.intensity*flicker:0;
    const residual=this.active?1:Math.min(1,this.tail/.5);
    for(const p of this.smoke){
      const time=this.visualElapsed*p.speed+p.phase,life=(this.visualElapsed*p.rise+p.phase/(Math.PI*2))%1;
      p.sprite.position.set(p.origin.x+Math.sin(time)*.18+windX*life*.85,p.origin.y+life*V.smokeRise,p.origin.z+Math.cos(time*.7)*.18+windZ*life*.85);
      p.sprite.material.opacity=V.smokeOpacity*Math.sin(Math.PI*life)**.65*(this.waterImpactTime>0?1.3:1)*residual;
      p.sprite.scale.setScalar(V.smokeBaseSize+life*V.smokeGrowth);
    }
    this.waterImpactTime=Math.max(0,this.waterImpactTime-delta);
    this.updateImpactParticles(this.waterSplashes,delta,1.9);this.updateImpactParticles(this.waterMist,delta,.28);
    for(let i=0;i<this.emberPhases.length;i++){
      const time=this.visualElapsed*1.5+this.emberPhases[i];this.emberPositions[i*3+1]+=delta*V.emberRiseSpeed;
      if(this.emberPositions[i*3+1]>this.impactCenter.y+3){this.emberPositions[i*3+1]=this.impactCenter.y+.15;this.emberPositions[i*3]=this.impactCenter.x+Math.sin(i)*.35;this.emberPositions[i*3+2]=this.impactCenter.z+Math.cos(i)*.35;}
      this.emberPositions[i*3]+=(Math.sin(time)*.1+windX*.35)*delta;this.emberPositions[i*3+2]+=(Math.cos(time)*.1+windZ*.35)*delta;
    }
    this.embers.material.opacity=.7*fraction;this.embers.geometry.attributes.position.needsUpdate=true;
    if(!this.active&&this.tail<=0)this.object.visible=false;
  }
  private updateImpactParticles(particles:ImpactParticle[],delta:number,gravity:number):void {
    for(const p of particles){
      if(p.life<=0)continue;p.life=Math.max(0,p.life-delta);p.velocity.y-=gravity*delta;p.sprite.position.addScaledVector(p.velocity,delta);
      p.sprite.material.opacity=Math.min(1,p.life*3)*(particles===this.waterMist ? .5 : .9);
      p.sprite.scale.setScalar(particles===this.waterMist ? .8+(1-p.life/FIRE_WATER_SMOKE_DURATION)*.8 : .12+p.life*.18);p.sprite.visible=p.life>0;
    }
  }
}
