#!/usr/bin/env python3
"""Margaryan Motion Studio: Cinematic Engine 2.1 / product-first physically lit Cycles stage.

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

MAT_DARK=principled("01 / anodized graphite metal",(0.028,.033,.031),.83,.32,.18,220,.030)
MAT_ALLOY=principled("02 / brushed titanium aluminium",(.22,.275,.255),.93,.29,.36,310,.026)
MAT_BRUSH=principled("03 / light catching milled aluminum",(.60,.69,.63),.99,.16,.38,320,.018)
MAT_KEYS=principled("04 / dark genuine PBT keycaps",(.012,.016,.013),.04,.48,.07,250,.018)
MAT_FACE=principled("05 / black display glass",(.005,.010,.007),.16,.15,.75)
MAT_TRACK=principled("06 / matte etched trackpad",(.14,.19,.17),.72,.38,.17,180,.035)
MAT_SLATE=principled("07 / minimal matte basalt pedestal",(.019,.026,.021),.10,.66,.02,75,.24)
MAT_GROUND=principled("08 / ink black satin infinity floor",(.0045,.007,.005),.07,.62,.01,115,.035)
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
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=4.15,depth=.14,location=(0,0,.065))
plinth=bpy.context.object;plinth.name="Monolithic basalt presentation plinth"
plinth.scale.y=.60
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
plinth.data.materials.append(MAT_SLATE);bevel(plinth,.030,6)
cube("Endless studio / satin shadow floor",(0,0,-.075),(200,200,.08),MAT_GROUND,.025)

# Editorial decision V2.1: no decorative ring behind the product.\n\nlaptop_anchor=bpy.data.objects.new("Laptop rig / independent geometry",None)
bpy.context.collection.objects.link(laptop_anchor)
laptop_anchor.location=(0,-.07,.14)
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
surface.inputs["Strength"].default_value=.83
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

# V2.1 quality gate: omit unreadable feature cards. Show the actual product screen instead.\n\n# Photography: a few large diffusion sources, directional rims and warm architectural light.
area("Key softbox / precise 3.5m",( -5.1,-4.6,7.7),1050,(.91,1,.94),3.6,5.5,(0,0,1.65))
area("Right ribbon / aluminium specular",(5.1,.7,5.2),560,(.73,1,.81),.72,4.5,(0,0,2.1))
area("Long overhead diffusion",(0,3.8,8.7),790,(.94,.97,1),5.8,2.0,(0,0,1))
area("Warm sculptural edge",(-3.8,4.5,4.9),390,(1,.84,.74),1.4,4.3,(0,0,2.2))
area("Subtle frontal fill",(1,-8.0,4.6),170,(.92,.98,.94),6,3,(0,0,1.7))

camera_data=bpy.data.cameras.new("Cinema 2.1 / 59mm product macro camera")
camera=bpy.data.objects.new("Cinema 2.1 / 59mm dolly",camera_data)
bpy.context.collection.objects.link(camera)
camera_data.lens=59
camera_data.sensor_width=36
camera_data.dof.use_dof=True
camera_data.dof.focus_object=laptop_anchor
camera_data.dof.aperture_fstop=11.0
S.camera=camera
def look_at(obj,pt):
    direction=Vector(pt)-obj.location
    obj.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
for frame,loc,target in [
   (1, (7.2,-14.7,6.7),(.0,.02,1.77)),
   (48,(5.2,-12.9,5.6),(.0,.02,1.86)),
   (96,(3.4,-10.8,4.8),(.12,.16,2.05))
]:
    camera.location=loc;look_at(camera,target)
    camera.keyframe_insert(data_path="location",frame=frame)
    camera.keyframe_insert(data_path="rotation_euler",frame=frame)
for fc in camera.animation_data.action.fcurves:
    for kp in fc.keyframe_points:kp.interpolation="BEZIER"

# Product is static, camera and light do the work. No misleading moving UI elements.
S.frame_start=1;S.frame_end=96;S.render.fps=24
S.camera.data.lens=59
S.frame_set(max(1,min(96,A.frame)))

if A.save_blend:
    os.makedirs(os.path.dirname(os.path.abspath(A.save_blend)),exist_ok=True)
    bpy.ops.file.pack_all()
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
