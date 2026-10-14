#!/usr/bin/env python3
"""PROMPTENCE / Cinematic Engine 2.0
A reproducible native Blender Cycles studio built from REAL 3D geometry.

This is a camera-ready art-direction test: NOT a generated image pretending to
be a scene, NOT a simulated brand dashboard, and NOT a production-approved ad.
Supply a genuine approved screenshot with --screen. No product metrics are invented.

Run in background Blender 4.5 LTS:
 blender -b -t 6 --python blender-promptence-studio.py -- \
   --screen /path/to/official-product.png --out /tmp/shot.png --size 1280x720 \
   --samples 32 --frame 42 --save-blend /tmp/promptence-studio.blend
"""
from __future__ import annotations

import argparse
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector
from math import radians, sin, cos, tau

def args():
    import sys
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(description="Native Cycles 3D promo renderer")
    p.add_argument("--screen", required=True, help="Real Promptence screen, reviewed for public use")
    p.add_argument("--out", required=True)
    p.add_argument("--size", default="1280x720")
    p.add_argument("--samples", type=int, default=32)
    p.add_argument("--frame", type=int, default=42)
    p.add_argument("--fps", type=int, default=24)
    p.add_argument("--save-blend", default=None)
    p.add_argument("--hdri", default=None, help="Optional CC0 studio HDRI (Poly Haven)")
    p.add_argument("--engine", choices=["CYCLES", "BLENDER_EEVEE_NEXT"], default="CYCLES")
    o = p.parse_args(raw)
    w,h = (int(v) for v in o.size.lower().split("x"))
    if not (480 <= w <= 4096 and 270 <= h <= 2160 and 2 <= o.samples <= 256):
        p.error("Resolution or sample count outside render budget")
    if not 1 <= o.frame <= 120:
        p.error("Shot frame must be 1..120 (5-second cinematic take)")
    if not os.path.isfile(o.screen):
        p.error("A real, existing product screenshot is REQUIRED")
    return o,w,h

O,W,H = args()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)

scene = bpy.context.scene
scene.render.engine = O.engine
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = O.out
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = O.fps
if O.engine == "CYCLES":
    scene.cycles.device = "CPU"
    scene.cycles.samples = O.samples
    scene.cycles.use_denoising = True
    scene.cycles.use_light_tree = True
else:
    scene.render.engine = "BLENDER_EEVEE_NEXT"

scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.render.image_settings.color_depth = "8"

def look_at(obj, xyz):
    direction = Vector(xyz) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

def cube(name, location, scale, material, bevel=.04, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    if bevel:
        mod = ob.modifiers.new("Machined edge | micro-bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.affect = "EDGES"
    ob.modifiers.new("Weighted production normals", "WEIGHTED_NORMAL")
    return ob

def principled(name, base=(.1,.1,.1,1), metal=0, rough=.4,
               coat=0.0, transmission=0, ior=1.45):
    m = bpy.data.materials.new(name);m.diffuse_color=base
    m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=base
    p.inputs["Metallic"].default_value=metal
    p.inputs["Roughness"].default_value=rough
    p.inputs["Coat Weight"].default_value=coat
    p.inputs["Coat Roughness"].default_value=.12
    p.inputs["Transmission Weight"].default_value=transmission
    p.inputs["IOR"].default_value=ior
    return m,p

def noisy_surface(material, strength=.10, distance=.03, scale=90):
    nodes=material.node_tree.nodes;links=material.node_tree.links
    out=nodes.get("Principled BSDF")
    tex=nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value=scale
    tex.inputs["Detail"].default_value=3
    tex.inputs["Roughness"].default_value=.74
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=strength
    bump.inputs["Distance"].default_value=distance
    links.new(tex.outputs["Fac"],bump.inputs["Height"])
    links.new(bump.outputs["Normal"],out.inputs["Normal"])

def area_light(name, xyz, power, size, width=None, color=(1,1,1), aim=(0,0,0)):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=power;data.color=color
    data.shape="RECTANGLE"
    data.size=size;data.size_y=width or size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    obj.location=xyz;look_at(obj,aim)
    return obj

def add_text(name, text, xyz, size=.21, color=None, font=None,
             align="LEFT", toward_front=True, extrude=0):
    c=bpy.data.curves.new(name,"FONT")
    c.body=text;c.size=size;c.space_character=1.05
    c.align_x=align;c.align_y="CENTER"
    c.extrude=extrude;c.bevel_depth=.001
    obj=bpy.data.objects.new(name,c);scene.collection.objects.link(obj)
    obj.location=xyz
    if toward_front:obj.rotation_euler=(radians(90),0,0)
    if color:c.materials.append(color)
    if font:c.font=font
    return obj

def arc_curve(name, center, radius, material, angle0, angle1, z_shift=0):
    curve=bpy.data.curves.new(name,"CURVE");curve.dimensions="3D";curve.resolution_u=28
    curve.bevel_depth=.015;curve.bevel_resolution=4
    poly=curve.splines.new("POLY");poly.points.add(170)
    for i,p in enumerate(poly.points):
        a=angle0+(angle1-angle0)*(i/170)
        p.co=(center[0]+radius*cos(a),
              center[1],
              center[2]+radius*sin(a)+z_shift,
              1)
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o)
    curve.materials.append(material)
    return o

def camera_pose(pos, focus, focal):
    cam=bpy.data.objects["Cinema lens 50mm"]
    cam.location=pos;look_at(cam,focus)
    cam.data.lens=focal
    return cam

# Palette: no toy neon. Physically based graphite, neutral metals, ivory areas.
graphite,_=principled("01 | dark graphite",(.027,.032,.031,1),.38,.31,.12)
noisy_surface(graphite,.12,.018,64)
aluminium,_=principled("02 | satin-machined silver",(.31,.34,.32,1),.91,.21,.30)
noisy_surface(aluminium,.043,.0026,390)
rim_metal,_=principled("03 | precisely machined lid edge",(.53,.57,.55,1),.95,.16,.30)
keys,_=principled("04 | matte keyboard",(.018,.025,.022,1),.22,.36,.12)
noisy_surface(keys,.055,.0015,180)
laptop_glass,_=principled("05 | deep monitor glass",(.011,.017,.015,1),.18,.07,.72)
display_black,_=principled("06 | black inner bezel",(.005,.010,.007,1),.09,.25,.24)
rock,_=principled("07 | wet basalt detail",(.024,.029,.029,1),.13,.38,.12)
noisy_surface(rock,.46,.022,26)
stone_top,_=principled("08 | dark stone plinth",(.021,.028,.026,1),.12,.36,.12)
noisy_surface(stone_top,.28,.008,120)
ground,_=principled("09 | ebony studio floor",(.009,.013,.012,1),.27,.19,.30)
noisy_surface(ground,.035,.003,75)
glass_card,_=principled("10 | charcoal optical glass",(.034,.053,.047,1),.21,.19,.48,.31)
ivory,_=principled("11 | warm ivory letters",(.83,.94,.85,1),.09,.33,.25)
mint,_=principled("12 | subtle mint",(.32,.83,.54,1),.08,.35,.13)
arc_mat=bpy.data.materials.new("13 | natural soft warm arc")
arc_mat.use_nodes=True
node=arc_mat.node_tree.nodes.get("Principled BSDF")
node.inputs["Base Color"].default_value=(.96,.87,.69,1)
node.inputs["Emission Color"].default_value=(1,.91,.79,1)
node.inputs["Emission Strength"].default_value=5.5

# Photographic product screenshot; no invented analytics / KPI labels.
image=bpy.data.images.load(os.path.abspath(O.screen), check_existing=True)
image.colorspace_settings.name="sRGB"
screen_mat=bpy.data.materials.new("14 | owner-approved public product screenshot")
screen_mat.use_nodes=True
nodes=screen_mat.node_tree.nodes;links=screen_mat.node_tree.links
bs=nodes.get("Principled BSDF")
im=nodes.new("ShaderNodeTexImage");im.image=image
links.new(im.outputs["Color"],bs.inputs["Base Color"])
links.new(im.outputs["Color"],bs.inputs["Emission Color"])
bs.inputs["Emission Strength"].default_value=.70
bs.inputs["Metallic"].default_value=0
bs.inputs["Roughness"].default_value=.22

# Camera and stage: wet neutral slate with a single irregular basalt plinth.
bpy.ops.mesh.primitive_plane_add(size=250, location=(0,0,-.44))
floor=bpy.context.object;floor.name="Floor / subtle reflection";floor.data.materials.append(ground)

# Stylized but hand-shaped real 3D rock. The plinth is intentionally below the laptop
# so a backdrop stone never blocks the UI as happened in the WebGL V9.
def ragged_plinth(name, radius, top=-.10, bottom=-.41, n=82):
    verts=[]
    for layer,z in enumerate((bottom,top)):
        for i in range(n):
            a=tau*i/n
            r=radius + .085*sin(a*13)+.042*sin(a*31+.7)+.026*sin(a*71)
            if layer==1:r-=.04
            verts.append((r*cos(a),r*sin(a),z+.018*sin(a*19)))
    verts.append((0,0,top+.008))
    faces=[]
    for i in range(n):
        j=(i+1)%n;faces.append((i,j,n+j,n+i))
        faces.append((n+i,n+j,2*n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    o.data.materials.append(stone_top)
    bevel=o.modifiers.new("Broken rock edges", "BEVEL")
    bevel.width=.031;bevel.segments=2
    o.modifiers.new("Weighted bevel highlights","WEIGHTED_NORMAL")
    return o

plinth=ragged_plinth("Foreground hero / basalt stage",4.36)
# Backdrop is genuine rough 3D geometry with studio lighting, rather than
# the black-void background visible in the original WebGL V9 workprint.
wall_material,_=principled("15 | quarried graphite backwall",(.013,.018,.016,1),.08,.78,.03)
noisy_surface(wall_material,.48,.048,12)
cube("Background architectural slate wall",(0,12.1,3.8),(31,.55,10.7),
     wall_material,.25,2)
for x in (-9.1,-7.25,6.8,8.75):
    cube("Vertical quarried monolith %s"%x,(x,9.4,4.0),
         (.70,.95,8.8),wall_material,.12,2)
# Thin genuine glowing horizon. The light grazes the stone and subtly
# silhouettes the laptop without flooding the product screen.
horizon=bpy.data.materials.new("16 | warm geometric horizon emitter")
horizon.use_nodes=True
pp=horizon.node_tree.nodes.get("Principled BSDF")
pp.inputs["Base Color"].default_value=(.6,.57,.49,1)
pp.inputs["Emission Color"].default_value=(1,.83,.65,1)
pp.inputs["Emission Strength"].default_value=6
cube("Long warm horizon slit",(0,7.1,.60),(22,.055,.026),horizon,.009,2)
area_light("Wide warm horizon bounce",(0,6.5,2.3),900,9.0,1.7,
           color=(1,.78,.60),aim=(0,0,1.6))

# Sparse photographic foreground rocks. Keep most of the floor available for
# actual reflections and avoid masking any public product interface.
for i,(x,y,r) in enumerate(((-4.85,-1.05,.71),(4.76,.32,.76),(-4.64,2.62,.48))):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=r,
                                          location=(x,y,-.09+r*.43))
    ob=bpy.context.object;ob.name="Black basalt specimen / %s"%i
    ob.scale=(1.34,.8,.79)
    ob.data.materials.append(rock)

# Slim contact shadow beneath computer, rendered naturally by Cycles.
cube("Satin presentation foot", (0,0,.02),(6.75,3.98,.08),graphite,.10,7)

# Premium physical laptop modeled in meters-ish dimensions, no paper-thin monitor.
base=cube("Laptop chassis | precision aluminium", (0,-.04,.17),(6.66,3.95,.20),aluminium,.065,8)
base_inset=cube("Keyboard well / forged dark metal",(0,-.32,.285),(6.08,2.13,.02),graphite,.04,5)
base_trim=cube("Anodized metal front lip",(0,-2.006,.135),(5.85,.024,.042),rim_metal,.012,3)
touchpad=cube("Precision tactile trackpad",(0,-1.50,.283),(2.12,.70,.008),aluminium,.035,6)

keymat=keys
for row in range(5):
    for col in range(15):
        if row==4 and 5<=col<=9:continue
        x=(col-7)*.383
        y=.43-row*.375
        key=cube("Key / row%02d / col%02d"%(row,col),(x,y,.309),
                 (.330,.295,.026),keymat,.027,3)
spacebar=cube("Full metal keyboard spacebar",(0,-1.08,.310),(1.86,.295,.026),
              keymat,.026,3)
# Hinges
for side in (-1,1):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.105,depth=.45,
                                        location=(side*2.55,1.81,.35))
    o=bpy.context.object;o.name="Metal laptop hinge";o.rotation_euler.y=radians(90)
    o.data.materials.append(rim_metal)

# The screen's front physically faces camera at negative Y. Camera sees true parallax.
back=cube("Laptop upper lid / metal",(0,1.85,2.25),(6.56,.15,3.89),
          aluminium,.09,8)
back.rotation_euler.x=radians(-5)
lid_bezel=cube("LCD black glass surround",(0,1.745,2.26),(6.27,.026,3.61),
               display_black,.059,6)
lid_bezel.rotation_euler.x=radians(-5)

# UV screenshot plane local XY rotates into world XZ.
bpy.ops.mesh.primitive_plane_add(size=2, location=(0,1.704,2.29))
screen=bpy.context.object;screen.name="REAL official Promptence homepage"
screen.scale=(3.025,1.70,1);screen.rotation_euler.x=radians(85)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
screen.data.materials.append(screen_mat)
# Screen normal rotated toward negative Y. Material self-emission controlled, no blown whites.
# Webcam dot
bpy.ops.mesh.primitive_uv_sphere_add(segments=14,ring_count=8,radius=.024,
                                    location=(0,1.693,4.105))
bpy.context.object.name="Built-in laptop camera dot";bpy.context.object.data.materials.append(keys)

# A single very subtle arch silhouette behind the machine, not a literal glowing green orb.
arc_curve("Architectural backlight arc",(2.1,5.6,3.15),3.25,arc_mat,radians(-33),radians(189))
for side in (-1,1):
    area_light("Edge strip %s"%side,(side*5.5,-1.0,7),1250,6.0,1.0,
               color=(.87,1,.90) if side>0 else (1,.94,.86),aim=(0,1,2))

# Cards are real 3D smoked optical glass; no imaginary percentages or graphs.
# Keep at most three readable labels instead of five synthetic data widgets.
fonts=[
 "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf",
 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
]
font_file=next((p for p in fonts if os.path.isfile(p)),None)
font=bpy.data.fonts.load(font_file) if font_file else None

def feature_card(title,subtitle,x,y,z,delay):
    glass=cube("Glass data plate / "+title,(x,y,z),(2.33,.044,.91),glass_card,.09,7)
    glass.rotation_euler.z=radians(-2.4 if x<0 else 2.4)
    # Face-camera text directly above slab, with its own material (not fake metrics).
    label=add_text("Capability / "+title,title,(x-1.01,y-.040,z+.13),.24,ivory,font)
    sub=add_text("Source honest / "+title,subtitle,(x-1.01,y-.041,z-.18),.115,mint,font)
    # keyframed emergence / actual object motion, all components stay aligned
    for ob in (glass,label,sub):
        start=ob.location.copy()
        ob.location.z=start.z-.12
        ob.keyframe_insert(data_path="location",frame=1+delay)
        ob.location.z=start.z
        ob.keyframe_insert(data_path="location",frame=42+delay)
    return glass

feature_card("AI VISIBILITY","Observe brand appearances", -4.34,2.50,3.60,0)
feature_card("SOURCES","Trace supporting evidence", -4.49,2.40,2.30,10)
feature_card("DIAGNOSIS","Find what needs to change", 3.75,3.0,3.63,20)

# Subtle logo type on left of frame is cinematic layout, not a fake app metric.
# It is deliberately behind the physical laptop and not oversized.
add_text("Top left PROMPTENCE", "PROMPTENCE",(-4.8,2.6,5.25),.37,ivory,font)
add_text("Headline identity", "UNDERSTAND THE ANSWER",(-4.8,2.6,4.92),.12,mint,font)

area_light("Hero key / 4m softbox",(-4.2,-2.6,8.6),1150,6.2,3.3,
           color=(1,.97,.94),aim=(0,0,1.45))
area_light("Card edge / silkbox",(5.3,2.5,7.2),1150,4.8,2,
           color=(.77,1,.86),aim=(.5,1.8,2.7))
area_light("Neutral screen glance",(0,-7.5,5.2),220,3.8,2.0,
           color=(1,1,1),aim=(0,1.7,2.4))

world=bpy.data.worlds.new("Near-black studio / no fake stars")
scene.world=world
world.use_nodes=True
world.node_tree.nodes.get("Background").inputs["Color"].default_value=(.018,.025,.021,1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.35
if O.hdri:
    if not os.path.isfile(O.hdri):
        raise FileNotFoundError("Expected CC0 HDRI path does not exist: "+O.hdri)
    env_node=world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env_node.image=bpy.data.images.load(os.path.abspath(O.hdri), check_existing=True)
    world.node_tree.links.new(env_node.outputs["Color"],world.node_tree.nodes.get("Background").inputs["Color"])

cam_data=bpy.data.cameras.new("Cinema lens 50mm")
cam=bpy.data.objects.new("Cinema lens 50mm",cam_data)
scene.collection.objects.link(cam);scene.camera=cam
cam.data.type="PERSP"
cam.data.sensor_width=36
cam.data.lens=45
cam.data.dof.use_dof=True
cam.data.dof.focus_distance=13.5
cam.data.dof.aperture_fstop=8.0
# Stable physically motivated camera path over 5s. Later shots can reuse the rig.
pose1=(7.7,-12.5,5.75)
pose2=(6.4,-10.75,5.58)
focus1=(0,.92,2.48)
focus2=(.06,1.12,2.52)
for frame,pos,focalpoint,lens in (
    (1,pose1,focus1,44),
    (48,(7.1,-11.8,5.66),(0,1.0,2.45),47),
    (120,pose2,focus2,49)
):
    camera_pose(pos,focalpoint,lens)
    cam.keyframe_insert(data_path="location",frame=frame)
    cam.keyframe_insert(data_path="rotation_euler",frame=frame)
    cam.data.keyframe_insert(data_path="lens",frame=frame)
for fcurve in cam.animation_data.action.fcurves if hasattr(cam.animation_data.action,'fcurves') else []:
    for point in fcurve.keyframe_points:point.interpolation="BEZIER"
scene.frame_set(O.frame)

# Camera image ownership and traceability for review.
scene["shot_name"]="PROMPTENCE - CINEMATIC ENGINE 2.0"
scene["source"]="Owner-approved authentic Promptence screenshot"
scene["authentic_source_image"]=os.path.basename(O.screen)
scene["no_fabricated_metrics"]=True
scene["publication_approved"]=False
scene["cinematic_gate"]="Single frame must pass HUMAN art direction review before 120-frame master"

if O.save_blend:
    # Portable project: pack *only* the owner-approved screen and CC0 HDRI image,
    # never bundle font files or external account content.
    image.pack()
    if O.hdri:env_node.image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(O.save_blend))
scene.render.filepath=os.path.abspath(O.out)
bpy.ops.render.render(write_still=True)
print("CINEMATIC_CYCLES_RENDER_OK",scene.render.filepath,
      "frames",scene.frame_start,scene.frame_end,
      "frame",O.frame,"samples",O.samples,"engine",O.engine)
