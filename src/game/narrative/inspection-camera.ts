import * as THREE from 'three';
import type { InspectionFrame } from '../world/investigation-style';

/** Shared inspection camera: bounds fitting, clear card area and exact restoration. */
export class InspectionCamera {
  active = false;
  private elapsed = 0;
  private duration = 1.5;
  private readonly savedPosition = new THREE.Vector3();
  private readonly savedRotation = new THREE.Quaternion();
  private readonly destination = new THREE.Vector3();
  private readonly destinationRotation = new THREE.Quaternion();
  private readonly aim = new THREE.PerspectiveCamera();
  private readonly center = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly sphere = new THREE.Sphere();
  private readonly bounds = new THREE.Box3();
  private readonly visibility = new Map<THREE.Object3D,boolean>();
  private savedLens: { fov:number;near:number;far:number;zoom:number;filmOffset:number;view:THREE.PerspectiveCamera['view'] } | null = null;
  private targetFov = 45;
  private clearance = .04;
  private subject:THREE.Object3D|null=null;
  private frame:InspectionFrame|null=null;
  private aspect=0;
  constructor(private readonly camera:THREE.Camera,private readonly terrain:(x:number,z:number)=>number) {}
  begin(subject:THREE.Object3D,frame:InspectionFrame,duration:number):void {
    if(this.active)return;
    this.active=true;this.elapsed=0;this.duration=duration;this.clearance=frame.groundClearance;
    this.savedPosition.copy(this.camera.position);this.savedRotation.copy(this.camera.quaternion);
    this.camera.children.forEach((child)=>{this.visibility.set(child,child.visible);child.visible=false;});
    const camera=this.camera as THREE.PerspectiveCamera, aspect=camera.isPerspectiveCamera?camera.aspect:16/9;
    if(camera.isPerspectiveCamera) {
      this.savedLens={fov:camera.fov,near:camera.near,far:camera.far,zoom:camera.zoom,filmOffset:camera.filmOffset,view:camera.view?{...camera.view}:null};
      camera.near=frame.near;camera.zoom=1;camera.filmOffset=0;camera.clearViewOffset();camera.updateProjectionMatrix();
    }
    this.subject=subject;this.frame=frame;this.fit(subject,frame,aspect);
  }
  private fit(subject:THREE.Object3D,frame:InspectionFrame,aspect:number):void {
    this.aspect=aspect;
    this.bounds.setFromObject(subject);this.bounds.getBoundingSphere(this.sphere);this.center.copy(this.sphere.center);
    const half=THREE.MathUtils.degToRad(frame.fov/2),bottom=aspect<=1.15;
    const fitHalf=Math.min(Math.atan(Math.tan(half)*(bottom ? .48 : 1)),Math.atan(Math.tan(half)*aspect*(bottom ? .94 : .58)));
    const distance=Math.max(frame.minDistance,this.sphere.radius/Math.sin(fitHalf)*frame.fitMargin);
    this.destination.set(frame.direction[0],frame.direction[1],frame.direction[2]).normalize().multiplyScalar(distance).add(this.center);
    this.destination.y=Math.max(this.destination.y,this.terrain(this.destination.x,this.destination.z)+frame.groundClearance);
    const framingDistance=this.destination.distanceTo(this.center);
    this.aim.position.copy(this.destination);this.aim.lookAt(this.center);
    this.right.set(1,0,0).applyQuaternion(this.aim.quaternion);this.up.set(0,1,0).applyQuaternion(this.aim.quaternion);
    this.target.copy(this.center);
    if(bottom)this.target.addScaledVector(this.up,-framingDistance*Math.tan(half)*.42);
    else this.target.addScaledVector(this.right,framingDistance*Math.tan(half)*aspect*.4);
    this.aim.lookAt(this.target);this.destinationRotation.copy(this.aim.quaternion);this.targetFov=frame.fov;
  }
  update(delta:number):boolean {
    if(!this.active)return false;
    const perspective=this.camera as THREE.PerspectiveCamera;
    if(perspective.isPerspectiveCamera&&perspective.aspect!==this.aspect&&this.subject&&this.frame)this.fit(this.subject,this.frame,perspective.aspect);
    this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,delta));
    const t=this.duration>0?this.elapsed/this.duration:1,blend=t*t*(3-2*t);
    this.camera.position.lerpVectors(this.savedPosition,this.destination,blend);
    // Clamp every sample of the transition, including the small macro-view near plane.
    this.camera.position.y=Math.max(this.camera.position.y,this.terrain(this.camera.position.x,this.camera.position.z)+this.clearance);
    this.camera.quaternion.slerpQuaternions(this.savedRotation,this.destinationRotation,blend);
    if(this.savedLens){const camera=this.camera as THREE.PerspectiveCamera;camera.fov=THREE.MathUtils.lerp(this.savedLens.fov,this.targetFov,blend);camera.updateProjectionMatrix();}
    return t===1;
  }
  maintain():void {
    const camera=this.camera as THREE.PerspectiveCamera;
    if(this.active&&camera.isPerspectiveCamera&&camera.aspect!==this.aspect)this.update(0);
  }
  restore():void {
    if(!this.active)return;
    this.camera.position.copy(this.savedPosition);this.camera.quaternion.copy(this.savedRotation);
    if(this.savedLens){
      const camera=this.camera as THREE.PerspectiveCamera,lens=this.savedLens;
      camera.fov=lens.fov;camera.near=lens.near;camera.far=lens.far;camera.zoom=lens.zoom;camera.filmOffset=lens.filmOffset;camera.view=lens.view?{...lens.view}:null;camera.updateProjectionMatrix();
    }
    this.visibility.forEach((visible,child)=>child.visible=visible);this.visibility.clear();this.savedLens=null;this.subject=null;this.frame=null;this.active=false;
  }
}
