/**
 * Actual mathematical 3D perspective projection rendered through Canvas2D.
 * No fake neural video or claim of physically-based 3D raytracing.
 * Only geometry is camera-moved; typography stays in protected safe areas.
 */
interface Point3 {x:number;y:number;z:number}
interface ScreenPoint {x:number;y:number;depth:number;visible:boolean}
const TAU=Math.PI*2;
function project3D(p:Point3,time:number,centerX:number,centerY:number,focal=690):ScreenPoint {
  const rx=-.24+Math.sin(time*.13)*.13;
  const ry=.32+Math.cos(time*.09)*.13;
  const ca=Math.cos(ry),sa=Math.sin(ry),cb=Math.cos(rx),sb=Math.sin(rx);
  const x=p.x*ca+p.z*sa;
  const z=-p.x*sa+p.z*ca;
  const y=p.y*cb-z*sb;
  const zz=p.y*sb+z*cb+820;
  const visible=zz>140;
  const perspective=focal/Math.max(140,zz);
  return {x:centerX+x*perspective,y:centerY+y*perspective,depth:zz,visible};
}
function interpolate(a:ScreenPoint,b:ScreenPoint,t:number):ScreenPoint{
  return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,depth:a.depth+(b.depth-a.depth)*t,visible:a.visible&&b.visible};
}
/** Lens-space 3D floor + floating signal lattice, not a copied UI background. */
export function drawWorldRig(
  ctx:CanvasRenderingContext2D,W:number,H:number,time:number,
  accent:string,shot:number,mode:"floor"|"signal"|"portal"
) {
  const landscape=H<810;
  const cx=W*(landscape?.72:.55),cy=H*(landscape?.71:.785);
  const elapsed=time+shot*.21;
  ctx.save();
  ctx.globalAlpha*=mode==="portal"?.8:mode==="signal"?.56:.48;
  const far=mode==="portal"?430:660;
  const cols=mode==="portal"?11:15, rows=mode==="portal"?6:10;
  const space=mode==="portal"?60:95;
  // Rows and columns form a true 3D lattice; they shrink by inverse depth.
  const points:ScreenPoint[][]=[];
  for(let j=0;j<rows;j++){
    const row:ScreenPoint[]=[];
    for(let i=0;i<cols;i++){
      const x=(i-(cols-1)/2)*space;
      const z=(j-(rows-1)/2)*space*1.3;
      const surface=Math.sin(x*.005+elapsed*.36)*22+Math.cos(z*.006-elapsed*.26)*24;
      const y=mode==="floor"?105+surface:mode==="portal"?surface*.7:Math.sin((i+j)*.7+elapsed*.15)*77;
      row.push(project3D({x,y,z:z+far},elapsed,cx,cy));
    }
    points.push(row);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const a=points[j][i];if(!a.visible)continue;
    const links:[number,number][]=[[j,i+1],[j+1,i]];
    for(const [yy,xx] of links){
      const b=points[yy]?.[xx];if(!b?.visible)continue;
      ctx.strokeStyle=(j+i+shot)%9===0?accent+"75":"#d3e5ed25";
      ctx.lineWidth=(j+i)%5===0?1.5:.75;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    if((i+j*3)%9===0){
      const brightness=Math.max(.2,1-(a.depth-550)/1400);
      ctx.fillStyle=accent+Math.round(70*brightness).toString(16).padStart(2,"0");
      ctx.beginPath();ctx.arc(a.x,a.y,1.7+brightness,0,TAU);ctx.fill();
    }
  }
  // Optical sweeper follows curves across the mesh, world-space anchored.
  const sweep=(elapsed*.35)%Math.max(1,rows-1);
  const lower=Math.floor(sweep),upper=Math.min(rows-1,lower+1),f=sweep-lower;
  ctx.strokeStyle=accent+"a5";ctx.lineWidth=1.8;ctx.beginPath();
  for(let i=0;i<cols;i++){
    const p=interpolate(points[lower][i],points[upper][i],f);
    if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
  }
  ctx.stroke();
  ctx.restore();
}
/** Full-scene camera: very small dolly and drift for legible film edit. */
export function withSceneCamera(
  ctx:CanvasRenderingContext2D,W:number,H:number,progress:number,index:number,draw:()=>void
){
  const p=Math.max(0,Math.min(1,progress));
  const dolly=1.012+(index%2?-.032:.03)*p;
  const dx=(index%2?-14:18)*(p-.5);
  const dy=(index%3===0?13:-9)*(p-.5);
  const tilt=(index%2?-1:1)*.004*(p-.5);
  const fx=W*.5,fy=H*.68;
  ctx.save();
  ctx.translate(fx+dx,fy+dy);ctx.rotate(tilt);ctx.scale(dolly,dolly);ctx.translate(-fx,-fy);
  draw();
  ctx.restore();
}
