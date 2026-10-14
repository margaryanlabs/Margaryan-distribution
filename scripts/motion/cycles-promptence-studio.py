#!/usr/bin/env python3
"""Margaryan Motion Studio: Cinematic Engine 2.0 / Blender Cycles product stage.

Real, editable Blender geometry + physically based materials + area lights.
Authentic public PROMPTENCE homepage as the laptop display texture.
Does NOT synthesize fake AI scan results, "scores", or testimonials.

Usage:
 blender -b -t 4 --python scripts/motion/cycles-promptence-studio.py -- \
    --screenshot /path/to/public.png --output /path/to/master.png \
    --width 1280 --height 720 --samples 32 --frame 48
 blender -b -t 4 --python scripts/motion/cycles-promptence-studio.py -- \
    --screenshot /path/to/public.png --save-blend /path/to/stage.blend \
    --output /path/to/frames --sequence --frames 1:72 --samples 12
"""
import argparse
import math
import os
import sys
from mathutils import Vector
import bpy

def args():
    argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    p=argparse.ArgumentParser()
    p.add_argument("--screenshot",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--save-blend",default="")
    p.add_argument("--width",type=int,default=1280)
    p.add_argument("--height",type=int,default=720)
    p.add_argument("--samples",type=int,default=32)
    p.add_argument("--frame",type=int,default=48)
    p.add_argument("--frames",default="1:72")
    p.add_argument("--sequence",action="store_true")
    p.add_argument("--engine",choices=["CYCLES","BLENDER_EEVEE_NEXT","BLENDER_EEVEE"],default="CYCLES")
    return p.parse_args(argv)
A=args()
if not os.path.isfile(A.screenshot):
    raise SystemExit("Approved public Promptence screenshot is missing: "+A.screenshot)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat)

# Keep source scene deterministic and internally adjustable.
S=bpy.context.scene
S.render.engine="CYCLES" if A.engine=="CYCLES" else "BLENDER_EEVEE_NEXT"
if S.render.engine=="CYCLES":
    S.cycles.device="CPU"
    S.cycles.samples=max(4,A.samples)
    S.cycles.use_denoising=True
S.render.resolution_x=A.width
S.render.resolution_y=A.height
S.render.resolution_percentage=100
S.render.film_transparent=False
S.render.image_settings.file_format="PNG"
S.render.image_settings.color_mode="RGBA"
S.world.color=(.006,.011,.008)
S.view_settings.view_transform="AgX"
S.view_settings.look="AgX - Medium High Contrast"

def principled(name, color,metal=0,rough=.32,coat=0,noise_scale=0,noise_strength=.0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    n=m.node_tree.nodes
    p=n.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Metallic"].default_value=metal
    p.inputs["Roughness"].default_value=rough
    p.inputs["Coat Weight"].default_value=coat
    if noise_scale:
        tex=n.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=noise_scale
        bump=n.new("ShaderNodeBump");bump.inputs["Strength"].default_value=noise_strength
        bump.inputs["Distance"].default_value=.035
        m.node_tree.links.new(tex.outputs["Fac"],bump.inputs["Height"])
        m.node_tree.links.new(bump.outputs["Normal"],p.inputs["Normal"])
    return m

def emission(name,color,strength):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    n=m.node_tree.nodes;n.clear()
    out=n.new("ShaderNodeOutputMaterial")
    e=n.new("ShaderNodeEmission")
    e.inputs["Color"].default_value=(*color,1)
    e.inputs["Strength"].default_value=strength
    m.node_tree.links.new(e.outputs["Emission"],out.inputs["Surface"])
    return m

MAT_DARK=principled("01 / graphite painted anodized aluminum",(0.035,.058,.047),.91,.27,.33,185,.075)
MAT_ALLOY=principled("02 / satin graphite aluminum",(.28,.33,.29),.94,.24,.28,220,.05)
MAT_BRUSH=principled("03 / polished edge / satin alloy",(.55,.67,.60),.97,.19,.38,320,.03)
MAT_KEYS=principled("04 / PBT charcoal keycap",(.014,.018,.015),.08,.37,.11,115,.025)
MAT_FACE=principled("05 / black display glass",(.005,.010,.007),.16,.15,.75)
MAT_TRACK=principled("06 / etched alloy trackpad",(.20,.26,.22),.75,.37,.18,210,.06)
MAT_SLATE=principled("07 / basalt ceremonial monolith",(.027,.036,.029),.10,.58,.08,32,.38)
MAT_GROUND=principled("08 / deep green shadow studio",(.008,.015,.010),.18,.49,.1,95,.10)
MAT_GREEN=emission("09 / restrained Promptence signal green",(.15,.94,.48),1.8)
MAT_IVORY=emission("10 / controlled gallery ivory",(.96,.87,.72),3.0)

def bevel(obj, amount=.045,segments=5):
    bevelmod=obj.modifiers.new("Machined bevel — highlight catch","BEVEL")
    bevelmod.width=amount;bevelmod.segments=segments
    normal=obj.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
    normal.keep_sharp=True
    return obj

def cube(name,location,scale,mat,bv=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    o=bpy.context.object;o.name=name
    o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bv:bevel(o,bv)
    return o

def parent_world(obj,parent):
    mx=obj.matrix_world.copy()
    obj.parent=parent
    obj.matrix_world=mx

def text(name,body,loc,size,material,orientation=(math.pi/2,0,0),spacing=1.1):
    curve=bpy.data.curves.new(name,"FONT")
    curve.body=body;curve.size=size;curve.space_character=spacing
    curve.extrude=.0006;curve.bevel_depth=.0003
    obj=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(obj)
    obj.location=loc;obj.rotation_euler=orientation
    obj.data.materials.append(material)
    return obj

def area(name,location,power,color,size_x,size_y,target):
    data=bpy.data.lights.new(name,"AREA");data.energy=power;data.color=color
    data.shape="RECTANGLE";data.size=size_x;data.size_y=size_y
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.location=location; obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
    return obj

# Single basalt display surface. Not a pile of fake low-poly rocks.
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=4.62,depth=.42,location=(0,0,.05))
plinth=bpy.context.object;plinth.name="Monolithic basalt presentation plinth"
plinth.scale.y=.69
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
plinth.data.materials.append(MAT_SLATE);bevel(plinth,.105,7)
cube("Endless studio / satin shadow floor",(0,0,-.24),(200,200,.08),MAT_GROUND,.025)

# A continuous luminous architectural arc sits in the back plane.
curve=bpy.data.curves.new("Arc diffuser 360° in actual 3D","CURVE")
curve.dimensions="3D";curve.resolution_u=36
curve.bevel_depth=.018;curve.bevel_resolution=4
spline=curve.splines.new("POLY")
count=140
spline.points.add(count-1)
for i,p in enumerate(spline.points):
    angle=(-.15+1.32*i/(count-1))*math.pi
    p.co=(4.85*math.cos(angle), 3.8, 2.8+3.4*math.sin(angle), 1.0)
arc=bpy.data.objects.new("Warm aperture / physically emitted tube",curve)
bpy.context.collection.objects.link(arc)
arc.data.materials.append(MAT_IVORY)

laptop_anchor=bpy.data.objects.new("Laptop rig / independent geometry",None)
bpy.context.collection.objects.link(laptop_anchor)
laptop_anchor.location=(0,-.07,.38)
# Keyboard deck. Rear of device is +Y. Front faces the viewer at -Y.
base=cube("CNC aluminum unibody lower chassis",(0,0,.24),(6.48,3.53,.145),MAT_ALLOY,.074)
parent_world(base,laptop_anchor)
blackpad=cube("Recessed black keyboard cavity",(0,.38,.326),(5.91,2.23,.018),MAT_DARK,.048)
parent_world(blackpad,laptop_anchor)
# True individually modelled, bevelled keycaps (not a flat keyboard image).
for row in range(5):
    for col in range(15):
        if row==0 and col in (0,14):continue
        if row==4 and 5<=col<=9:continue
        x=(col-7)*.366
        y=1.08-row*.39
        key=cube(f"PBT keycap R{row+1} C{col+1}",(x,y,.36),
            (.305,.31,.043),MAT_KEYS,.038)
        parent_world(key,laptop_anchor)
space=cube("Physical milled space bar",(0,-.48,.364),(1.89,.305,.047),MAT_KEYS,.035)
parent_world(space,laptop_anchor)
touchpad=cube("Glass recessed trackpad",(0,-1.285,.32),(2.04,.83,.009),MAT_TRACK,.04)
parent_world(touchpad,laptop_anchor)
lip=cube("Front CNC edge highlight",(0,-1.774,.205),(5.72,.009,.016),MAT_BRUSH,.006)
parent_world(lip,laptop_anchor)
# Hinge cylinder horizontally across X.
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.105,depth=5.89,
    location=(0,1.62,.385),rotation=(0,math.pi/2,0))
hinge=bpy.context.object;hinge.name="Continuous real metal hinge"
hinge.data.materials.append(MAT_DARK);parent_world(hinge,laptop_anchor)

lid=bpy.data.objects.new("Lid rig / editable hinge rotation",None)
bpy.context.collection.objects.link(lid)
lid.location=(0,1.60,.385)
lid.rotation_euler[0]=-.20
parent_world(lid,laptop_anchor)
# Lid local Z is vertical, local -Y is the viewer.
display=cube("Machined screen lid anodized metal",(0,1.57,2.35),
     (6.50,.115,3.91),MAT_ALLOY,.078)
parent_world(display,lid)
bezel=cube("Precision optical glass bezel",(0,1.493,2.35),
     (6.29,.008,3.71),MAT_FACE,.065)
parent_world(bezel,lid)

# Literal public screenshot: no fabricated brand/AI numbers.
image=bpy.data.images.load(os.path.abspath(A.screenshot),check_existing=True)
image.colorspace_settings.name="sRGB"
screenMat=bpy.data.materials.new("11 / Authentic PROMPTENCE public capture")
screenMat.use_nodes=True
nd=screenMat.node_tree.nodes;nd.clear()
out=nd.new("ShaderNodeOutputMaterial");texture=nd.new("ShaderNodeTexImage")
texture.image=image;texture.interpolation="Linear"
surface=nd.new("ShaderNodeEmission")
surface.inputs["Strength"].default_value=.95
screenMat.node_tree.links.new(texture.outputs["Color"],surface.inputs["Color"])
screenMat.node_tree.links.new(surface.outputs["Emission"],out.inputs["Surface"])
# Primitive plane has real UV coordinates, and sits in front of the glass.
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,1.480,2.35),
 rotation=(math.pi/2,0,0))
screen=bpy.context.object;screen.name="PUBLIC PRODUCT SCREEN — real screenshot UV"
screen.dimensions=(6.075,3.464,0)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
screen.data.materials.append(screenMat)
parent_world(screen,lid)
# Embedded non-invasive camera dot, embedded in the lid bezel, not floating text.
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.022,
    location=(0,1.468,4.21))
camera_dot=bpy.context.object;camera_dot.name="Lens / 2mm actual physical camera"
camera_dot.data.materials.append(MAT_DARK);parent_world(camera_dot,lid)

# Exact honest labels: no fake growth % and no invented provider recommendations.
# Only ONE optional supporting panel, set toward back-right and not over the screen.
panel_anchor=bpy.data.objects.new("Right supporting glass card / optional",None)
bpy.context.collection.objects.link(panel_anchor)
panel_anchor.location=(4.58,1.9,2.78);panel_anchor.rotation_euler[2]=-.10
card=cube("Capability panel / glass body",(4.58,1.9,2.78),
    (2.36,.046,.93),
    principled("12 / smoky glass",(.047,.115,.077),.35,.14,.8),.055)
parent_world(card,panel_anchor)
c1=text("Capability heading","AI VISIBILITY",(3.58,1.856,2.96),
  .18,MAT_IVORY)
parent_world(c1,panel_anchor)
c2=text("Capability body","DISCOVER  /  MEASURE",(3.58,1.851,2.65),
  .115,MAT_GREEN)
parent_world(c2,panel_anchor)
# Animate minimal reveal; only honest feature captions.
panel_anchor.scale=(.001,.001,.001)
panel_anchor.keyframe_insert(data_path="scale",frame=1)
panel_anchor.scale=(1,1,1)
panel_anchor.keyframe_insert(data_path="scale",frame=48)

# Photography: a few large diffusion sources, directional rims and warm architectural light.
area("Huge key softbox / 4x7m",(-5.5,-4.8,9.0),1450,(.93,1,.94),5.7,7.0,(0,0,1.65))
area("Right vertical ribbon",(6.0,-.7,5.2),900,(.73,1,.79),1.0,5.5,(0,0,2.1))
area("Long overhead diffusion",(0,3.8,9.3),1400,(.94,.97,1),7.0,2.5,(0,0,1))
area("Warm sculptural edge",(-3.2,4.5,5.0),870,(1,.78,.59),2.1,5.0,(0,0,2.2))
area("Wide frontal screen legibility",(2,-8.0,4.6),400,(.92,.98,.94),7,4,(0,0,1.7))

camera_data=bpy.data.cameras.new("Cinema 2.0 / 70mm animated physical camera")
camera=bpy.data.objects.new("Cinema 2.0 / 70mm dolly",camera_data)
bpy.context.collection.objects.link(camera)
camera_data.lens=67
camera_data.sensor_width=36
camera_data.dof.use_dof=True
camera_data.dof.focus_object=laptop_anchor
camera_data.dof.aperture_fstop=8.0
S.camera=camera
def look_at(obj,pt):
    direction=Vector(pt)-obj.location
    obj.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
for frame,loc,target in [
   (1, (8.2,-14.9,7.5),(0,0,2.0)),
   (48,(6.6,-13.6,6.25),(0,.05,1.9)),
   (96,(4.7,-10.75,5.45),(.17,.18,2.0))
]:
    camera.location=loc;look_at(camera,target)
    camera.keyframe_insert(data_path="location",frame=frame)
    camera.keyframe_insert(data_path="rotation_euler",frame=frame)
for fc in camera.animation_data.action.fcurves:
    for kp in fc.keyframe_points:kp.interpolation="BEZIER"

# Product is static, camera and light do the work. No misleading moving UI elements.
S.frame_start=1;S.frame_end=96;S.render.fps=24
S.camera.data.lens=67
S.frame_set(max(1,min(96,A.frame)))

if A.save_blend:
    os.makedirs(os.path.dirname(os.path.abspath(A.save_blend)),exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(A.save_blend))
    print("CINEMA_BLEND_SAVED",os.path.abspath(A.save_blend))
if A.sequence:
    first,last=[int(v) for v in A.frames.split(":")]
    os.makedirs(os.path.abspath(A.output),exist_ok=True)
    S.render.filepath=os.path.join(os.path.abspath(A.output),"frame_")
    S.frame_start=first;S.frame_end=last
    bpy.ops.render.render(animation=True)
else:
    os.makedirs(os.path.dirname(os.path.abspath(A.output)),exist_ok=True)
    S.render.filepath=os.path.abspath(A.output)
    bpy.ops.render.render(write_still=True)
print("CINEMA_CYCLES_DONE",A.output,"engine",S.render.engine,"samples",A.samples)
