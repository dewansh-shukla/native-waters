"""V1 appearance, bounded independent motion. Isolated Blender 5.2.2 factory startup only.
No downloads, external pixels, dependencies, live-scene access, or original-output writes.
"""
import bpy
import math
import hashlib
import json
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/polar-parrot-v1-animated'
GLB = ROOT / 'public/models/polar-parrot-study-v1-animated.glb'
assert bpy.app.background and bpy.app.version == (5, 2, 2), 'Use isolated Blender 5.2.2 --background --factory-startup'
assert set(bpy.data.scenes.keys()) == {'Scene'}, 'Factory-startup scene required'
assert set(bpy.data.objects.keys()) == {'Camera', 'Cube', 'Light'}, 'Factory-startup objects required'
OUT.mkdir(parents=True, exist_ok=True)
protected_paths = sorted(set(
    list((ROOT / 'artifacts/polar-parrot-study').rglob('*')) +
    list((ROOT / 'artifacts/polar-parrot-v2').rglob('*')) +
    [ROOT / 'tools/blender/create_polar_parrot_study.py', ROOT / 'tools/blender/create_polar_parrot_v2.py',
     ROOT / 'public/models/polar-parrot-study-v1.glb', ROOT / 'public/models/polar-parrot-study-v2.glb']))
original_hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                   for p in protected_paths if p.is_file()}
SCENE_NAME = 'Native Waters - Polar Parrot V1 Animated'
assert SCENE_NAME not in bpy.data.scenes, 'Study exists: inspect it before explicitly retrying.'
previous_scene = bpy.context.scene
scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, 61
S = 2.0 / 2.65
meshes = []


def image(name, kind, size=512):
    img = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = []
    for j in range(size):
        v = j / (size - 1)
        theta = v * math.tau
        for i in range(size):
            u = i / (size - 1)
            noise = math.sin(u * 153 + math.sin(v * 79)) * math.sin(v * 177 + u * 83)
            cell_u = (u * 44 + (int(v * 64) % 2) * .5) % 1
            cell_v = (v * 64) % 1
            edge = math.exp(-((cell_v - .25 - .45 * (cell_u - .5)**2) / .075)**2)
            if kind == 'skin':
                stripe = 0.0
                for n, center in enumerate((.32, .44, .56, .68, .79, .89)):
                    wave = .016 * math.sin(theta * 4 + n * 1.8) + .011 * math.sin(theta * 9 + n)
                    width = .023 + .008 * math.sin(theta * 3 + n * 2)
                    stripe = max(stripe, max(0.0, min(1.0, (width - abs(u-center-wave)) * 200)))
                shade = .80 + .16 * (1 - math.cos(theta)) / 2
                grain = noise * .018 - edge * .027
                base = (.57 * shade + grain, .73 * shade + grain, .78 * shade + grain)
                if u < .30:
                    olive = (.44, .56, .51)
                    blend = max(0.0, (.30-u) / .30) * .5
                    base = tuple(c*(1-blend) + olive[k]*blend for k,c in enumerate(base))
                dorsal = max(0, math.cos(theta)) * .13
                rgb = tuple(max(.015, c*(1-stripe*.88)-dorsal+noise*.008) for c in base)
            elif kind == 'normal':
                du = .08 * math.sin(cell_u * math.tau) * edge
                dv = .12 * math.cos(cell_v * math.tau) * edge
                rgb = (.5+du, .5+dv, .985)
            elif kind in ('fin', 'barred-fin'):
                ray = max(0, math.cos(u * math.tau * 22))**12
                rgb = (.16 + ray*.055 + v*.13, .29+ray*.065+v*.18, .35+ray*.075+v*.20)
                if kind == 'barred-fin':
                    body_u = (.35 + 1.47*u)/1.9
                    stripe = max(max(0.0, min(1.0, (.027-abs(body_u-c-.012*math.sin(v*9+n)))*160)) for n,c in enumerate((.32,.44,.56,.68,.79,.89)))
                    rgb = tuple(c*(.85-stripe*.68)+noise*.006 for c in rgb)
            elif kind == 'eye':
                fleck = .06*math.sin(u*193)*math.sin(v*127) + .035*math.sin(u*45+v*61)
                rgb = (.49+fleck, .39+fleck, .16+fleck*.45)
            else:
                rgb = (.36+edge*.14,)*3
            pixels.extend((*rgb, 1.0))
    if kind in ('normal', 'roughness'):
        img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(pixels)
    img.update()
    img.pack()
    return img


def material(name, color, roughness=.4, texture=None, normal=None, alpha=1.0, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        mat.surface_render_method = 'DITHERED'
        mat.use_transparent_shadow = True
    if texture:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = texture
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if normal:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = normal
        node = mat.node_tree.nodes.new('ShaderNodeNormalMap')
        node.inputs['Strength'].default_value = .22
        mat.node_tree.links.new(tex.outputs['Color'], node.inputs['Color'])
        mat.node_tree.links.new(node.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

skin_image = image('Polar parrot - original silver and six irregular bars', 'skin')
normal_image = image('Polar parrot - staggered micro scales', 'normal')
fin_image = image('Polar parrot - fin rays', 'fin', 256)
barred_fin_image = image('Polar parrot - dark barred dorsal membrane', 'barred-fin', 256)
eye_image = image('Polar parrot - olive gold iris flecks', 'eye', 256)
skin = material('Icy silver barred skin', (.55,.70,.75), .42, skin_image, normal_image, metallic=.12)
finmat = material('Blue smoke translucent fin membrane', (.3,.45,.5), .48, fin_image, alpha=.72)
barredfinmat = material('Charcoal barred dorsal membrane', (.2,.3,.35), .48, barred_fin_image, alpha=.83)
raymat = material('Fine fin rays', (.24,.36,.39), .5)
gillmat = material('Recessed olive gill seams', (.055,.10,.105), .6)
lipmat = material('Muted graphite lips', (.13,.20,.19), .5)
mouthmat = material('Narrow mouth recess', (.012,.02,.018), .55)
eyeouter = material('Olive eye socket', (.25,.30,.17), .47, metallic=.15)
irismat = material('Golden olive iris', (.55,.43,.17), .31, eye_image, metallic=.25)
pupilmat = material('Black pupil', (.004,.008,.007), .12)
corneamat = material('Glossy corneal surface', (.16,.22,.17), .07, alpha=.10)
corneamat.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value = 1


def mesh(name, verts, faces, mat, uvs=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata([tuple(Vector(p)*S) for p in verts], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = True
    if uvs:
        layer = data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for li in poly.loop_indices:
                layer.data[li].uv = uvs[data.loops[li].vertex_index]
    meshes.append(obj)
    return obj

profile = [(-1.02,.105,.070,-.08),(-.92,.23,.125,-.035),(-.78,.43,.185,.015),(-.57,.565,.225,.015),(-.28,.66,.240,0),(.05,.665,.225,-.015),(.34,.55,.185,-.025),(.57,.34,.125,-.035),(.76,.17,.075,-.035),(.88,.125,.060,-.025)]

def section(x):
    for a,b in zip(profile, profile[1:]):
        if a[0] <= x <= b[0]:
            t = (x-a[0])/(b[0]-a[0])
            t = t*t*(3-2*t)
            return tuple(a[k]*(1-t)+b[k]*t for k in (1,2,3))
    return profile[0][1:] if x < profile[0][0] else profile[-1][1:]

verts, faces, uvs = [], [], []
NX, NT = 96, 128
for i in range(NX+1):
    x = -1.02 + 1.9*i/NX
    h,d,z = section(x)
    for j in range(NT+1):
        a = math.tau*j/NT
        verts.append((x,d*math.sin(a),z+h*math.cos(a)))
        uvs.append((i/NX,j/NT))
for i in range(NX):
    for j in range(NT):
        a = i*(NT+1)+j
        faces.append((a,a+NT+1,a+NT+2,a+1))
faces.append(tuple(range(NT,-1,-1)))
faces.append(tuple(NX*(NT+1)+j for j in range(NT+1)))
body = mesh('Polar parrot - deep oval body', verts, faces, skin, uvs)


def ellipsoid(name, center, radii, mat, segments=32, rings=16):
    vv, ff, uv = [], [], []
    for i in range(rings+1):
        a = math.pi*i/rings
        for j in range(segments+1):
            b = math.tau*j/segments
            vv.append((center[0]+radii[0]*math.sin(a)*math.cos(b),center[1]+radii[1]*math.sin(a)*math.sin(b),center[2]+radii[2]*math.cos(a)))
            uv.append((j/segments,i/rings))
    for i in range(rings):
        for j in range(segments):
            k=i*(segments+1)+j
            ff.append((k,k+1,k+segments+2,k+segments+1))
    return mesh(name,vv,ff,mat,uv)


def tube(name, points, radius, mat, sides=6):
    vv,ff=[],[]
    for i,p in enumerate(points):
        tangent = Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize()
        side=tangent.cross(Vector((0,1,0)))
        if side.length < .01:
            side=tangent.cross(Vector((0,0,1)))
        side.normalize()
        other=tangent.cross(side).normalized()
        for j in range(sides):
            a=math.tau*j/sides
            vv.append(Vector(p)+radius*(side*math.cos(a)+other*math.sin(a)))
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            ff.append((a,b,b+sides,a+sides))
    ff.extend((tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))))
    return mesh(name,vv,ff,mat)

for sign,side in ((-1,'L'),(1,'R')):
    center=(-.665,sign*.184,.215)
    ellipsoid('Eye socket '+side,center,(.113,.040,.115),eyeouter)
    ellipsoid('Golden iris '+side,(-.673,sign*.216,.216),(.084,.020,.086),irismat)
    ellipsoid('Pupil '+side,(-.681,sign*.233,.216),(.046,.010,.049),pupilmat)
    ellipsoid('Cornea '+side,(-.678,sign*.237,.217),(.087,.012,.088),corneamat)
    seam=[]
    for i in range(25):
        a=-1.4+2.7*i/24
        x=-.51+.16*math.cos(a)
        z=.015+.39*math.sin(a)
        h,d,zc=section(x)
        y=sign*(d*math.sqrt(max(.02,1-((z-zc)/h)**2))+.004)
        seam.append((x,y,z))
    tube('Curved operculum seam '+side,seam,.007,gillmat)
    # Low relief operculum follows the body rather than a detached plate.
    vv,ff,uv=[],[],[]
    for i in range(17):
        t=i/16; x=-.64+.27*t
        for j in range(21):
            a=math.pi*.28+math.pi*.45*j/20
            h,d,zc=section(x)
            vv.append((x,sign*(d*math.sin(a)+.005*math.sin(t*math.pi)),zc+h*math.cos(a)))
            uv.append(((x+1.02)/1.9,(a if sign==1 else math.tau-a)/math.tau))
    for i in range(16):
        for j in range(20):
            k=i*21+j; ff.append((k,k+1,k+22,k+21))
    mesh('Silver gill cover '+side,vv,ff,skin,uv)

ellipsoid('Narrow dark mouth opening',(-1.025,0,-.085),(.013,.071,.012),mouthmat,24,8)
for z in (-.102,-.066):
    tube('Blunt lip '+str(z),[(-1.030+.030*(2*i/16-1)**2,-.076+.152*i/16,z) for i in range(17)],.008,lipmat)


def fin(name, roots, tips, bone=None):
    vv,ff,uv=[],[],[]
    rows=7
    for i,(root,tip) in enumerate(zip(roots,tips)):
        for j in range(rows+1):
            t=j/rows
            p=Vector(root).lerp(Vector(tip),t)
            p.y += .012*math.sin(t*math.pi)*math.sin(i*.7)
            vv.append(p); uv.append((i/(len(roots)-1),t))
    for i in range(len(roots)-1):
        for j in range(rows):
            k=i*(rows+1)+j; ff.append((k,k+rows+1,k+rows+2,k+1))
    obj=mesh(name,vv,ff,barredfinmat if name.startswith('Continuous') else finmat,uv)
    obj['fin_bone']=bone or ''
    for i in range(0,len(roots),2):
        pts=[Vector(roots[i]).lerp(Vector(tips[i]),t/4) for t in range(5)]
        ray=tube(name+' ray '+str(i),pts,.0027,raymat,5)
        ray['fin_bone']=bone or ''
    return obj

roots,tips=[],[]
for i in range(37):
    t=i/36; x=-.67+1.47*t; h,d,z=section(x)
    root=(x,0,z+h*.985)
    lift=.025+.235*math.sin(math.pi*t)**.7
    # Rounded continuous sail with modest spiny scallops.
    tips.append((x+.07*math.sin(math.pi*t),0,root[2]+lift+(.015 if i%2 else 0)))
    roots.append(root)
fin('Continuous spiny dorsal',roots,tips)
roots,tips=[],[]
for i in range(29):
    t=i/28; x=-.21+.99*t; h,d,z=section(x)
    roots.append((x,0,z-h*.98))
    tips.append((x+.10*math.sin(math.pi*t),0,z-h-.22*math.sin(math.pi*t)**.75-.01))
fin('Broad rounded anal fin',roots,tips)
roots,tips=[],[]
for i in range(33):
    t=i/32; a=-1.0+2*t
    roots.append((.80+.09*(1-a*a),0,-.025+.115*a))
    tips.append((1.6-.16*abs(a)**2,0,-.025+.37*a))
fin('Fan caudal fin',roots,tips,'Tail')
for sign,side in ((-1,'L'),(1,'R')):
    roots,tips=[],[]
    for i in range(19):
        t=i/18
        roots.append((-.37+.075*t,sign*.223,-.10-.085*t))
        tips.append((-.03+.12*math.sin(math.pi*t),sign*(.29+.15*math.sin(math.pi*t)),-.11-.32*t))
    fin('Paired pectoral '+side,roots,tips,'Pectoral.'+side)
    roots,tips=[],[]
    for i in range(13):
        t=i/12
        roots.append((-.40+.13*t,sign*.09,-.48-.04*t))
        tips.append((-.15+.17*t,sign*(.115+.05*math.sin(math.pi*t)),-.70+.11*t))
    fin('Paired pelvic '+side,roots,tips)

arm=bpy.data.armatures.new('Polar parrot V1 independent motion skeleton')
rig=bpy.data.objects.new('PolarParrotRig',arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bone_specs = [
    ('Head',(-.8,0,0),(-.4,0,0),None),
    ('Spine',(-.4,0,0),(.45,0,0),'Head'),
    ('Tail',(.45,0,0),(1.5,0,0),'Spine'),
    ('Pectoral.L',(-.37,-.22,-.12),(-.01,-.43,-.3),'Spine'),
    ('Pectoral.R',(-.37,.22,-.12),(-.01,.43,-.3),'Spine'),
    ('TailTip',(1.05,0,-.025),(1.55,0,-.025),'Tail'),
    ('Gill.L',(-.64,-.18,-.35),(-.64,-.18,.4),'Head'),
    ('Gill.R',(-.64,.18,-.35),(-.64,.18,.4),'Head'),
    ('Jaw',(-.98,0,-.06),(-1.03,0,-.10),'Head'),
    ('Dorsal',(-.67,0,.50),(.80,0,.15),'Spine'),
    ('Anal',(-.21,0,-.63),(.78,0,-.2),'Spine'),
    ('Pelvic.L',(-.40,-.09,-.48),(-.05,-.13,-.68),'Head'),
    ('Pelvic.R',(-.40,.09,-.48),(-.05,.13,-.68),'Head'),
]
for name,head,tail,parent in bone_specs:
    bone=arm.edit_bones.new(name)
    bone.head=Vector(head)*S; bone.tail=Vector(tail)*S
    if parent: bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')


def clamp(t):
    return max(0.0, min(1.0, t))


def trunk_weights(x):
    if x < -.35:
        t=clamp((x+.65)/.30)
        return {'Head':1-t,'Spine':t}
    t=clamp((x-.20)/.55)
    return {'Spine':1-t,'Tail':t}


# Save rest geometry/material/UV fingerprints before changing only weights and poses.
def appearance_fingerprint():
    digest = hashlib.sha256()
    for obj in meshes:
        digest.update(obj.name.encode())
        for v in obj.data.vertices: digest.update(struct.pack('<3f', *v.co))
        for poly in obj.data.polygons:
            digest.update(struct.pack('<'+'I'*len(poly.vertices), *poly.vertices))
        for layer in obj.data.uv_layers:
            for uv in layer.data: digest.update(struct.pack('<2f', *uv.uv))
    return digest.hexdigest()


rest_fingerprint = appearance_fingerprint()
gill_source = []
for obj in meshes:
    obj.parent=rig
    groups={name:obj.vertex_groups.new(name=name) for name, *_ in bone_specs}
    named=obj.get('fin_bone','')
    for v in obj.data.vertices:
        x,y,z=v.co/S
        weights=trunk_weights(x)
        if obj.name.startswith(('Silver gill cover ', 'Curved operculum seam ')):
            side=obj.name[-1]
            t=clamp((x+.64)/.27)
            t=t*t*(3-2*t)
            weights={'Head':1-t,'Gill.'+side:t}
            gill_source.append((obj,v.index,v.co.copy()))
        elif obj.name.startswith('Blunt lip -0.102'):
            weights={'Jaw':1.0}
        elif obj.name.startswith(('Eye socket ', 'Golden iris ', 'Pupil ', 'Cornea ', 'Blunt lip ', 'Narrow dark mouth')):
            weights={'Head':1.0}
        elif named == 'Tail':
            t=clamp((x-1.05)/.5)
            weights={'Tail':1-t,'TailTip':t}
        elif named.startswith('Pectoral.'):
            # Keep the original base fixed; taper flutter into the membrane/rays.
            t=clamp((x+.37)/.35)
            weights={'Head':1-t,named:t}
        else:
            fin_name=None
            if obj.name.startswith('Continuous'):
                h,d,zc=section(x); t=clamp((z-zc-h*.985)/.23); fin_name='Dorsal'
            elif obj.name.startswith('Broad rounded anal'):
                h,d,zc=section(x); t=clamp((zc-h*.98-z)/.22); fin_name='Anal'
            elif obj.name.startswith('Paired pelvic'):
                root=-.48-.04*clamp((x+.40)/.13)
                t=clamp((root-z)/.18); fin_name='Pelvic.'+obj.name.split()[2]
            if fin_name:
                weights={k:w*(1-t) for k,w in weights.items()}
                weights[fin_name]=t
        for name,w in weights.items():
            if w>0: groups[name].add([v.index],w,'REPLACE')
    mod=obj.modifiers.new('Smooth swim deformation','ARMATURE'); mod.object=rig
assert appearance_fingerprint() == rest_fingerprint, 'Motion must not alter V1 geometry or UVs'

# Measure actual evaluated cover/seam movement without moving the body/head.
for b in rig.pose.bones: b.rotation_mode='XYZ'
for side,sign in (('L',-1),('R',1)):
    rig.pose.bones['Gill.'+side].rotation_euler.y=sign*math.radians(5)
bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
gill_displacement=max((obj.evaluated_get(depsgraph).data.vertices[i].co-co).length
                      for obj,i,co in gill_source)
assert .002 <= gill_displacement <= .03, gill_displacement
for b in rig.pose.bones: b.rotation_euler=(0,0,0)
bpy.context.view_layer.update()

# Consolidate exactly the original eleven material batches after weighting.
for mat in (skin,finmat,barredfinmat,raymat,gillmat,lipmat,mouthmat,eyeouter,irismat,pupilmat,corneamat):
    batch=[o for o in scene.objects if o.type=='MESH' and o.data.materials[0] == mat]
    if len(batch)>1:
        for o in scene.objects: o.select_set(False)
        for o in batch: o.select_set(True)
        bpy.context.view_layer.objects.active=batch[0]
        bpy.ops.object.join()
meshes=[o for o in scene.objects if o.type=='MESH']

clip_frames={'Swim':42,'Breathing':60,'FinIdle':54}
clip_bones={'Swim':{'Spine','Tail','TailTip'},
            'Breathing':{'Gill.L','Gill.R','Jaw'},
            'FinIdle':{'Pectoral.L','Pectoral.R','Dorsal','Anal','Pelvic.L','Pelvic.R'}}
actions={}
rig.animation_data_create()
for clip,period in clip_frames.items():
    for b in rig.pose.bones: b.rotation_euler=(0,0,0)
    action=bpy.data.actions.new(clip)
    rig.animation_data.action=action
    for frame in range(1,period+2):
        # Explicitly identical endpoint instead of depending on sin(2pi) rounding.
        phase=math.tau*((frame-1)%period)/period
        opening=(1-math.cos(phase))*.5
        if clip=='Swim':
            rotations={'Spine':(0,0,.015*math.sin(phase)),
                       'Tail':(0,0,.085*math.sin(phase-.65)),
                       'TailTip':(0,0,.11*math.sin(phase-1.2))}
        elif clip=='Breathing':
            rotations={'Gill.L':(0,-math.radians(5)*opening,0),
                       'Gill.R':(0,math.radians(5)*opening,0),
                       'Jaw':(.006*opening,0,0)}
        else:
            rotations={'Pectoral.L':(.075*math.sin(phase+.3),0,.045*math.sin(phase)),
                       'Pectoral.R':(.065*math.sin(phase+1.6),0,-.05*math.sin(phase+1.1)),
                       'Dorsal':(0,.025*math.sin(phase+.5),0),
                       'Anal':(0,.030*math.sin(phase+1.8),0),
                       'Pelvic.L':(.035*math.sin(phase+2.3),0,0),
                       'Pelvic.R':(.030*math.sin(phase+3.5),0,0)}
        assert set(rotations)==clip_bones[clip]
        for name,rotation in rotations.items():
            bone=rig.pose.bones[name]; bone.rotation_euler=rotation
            bone.keyframe_insert(data_path='rotation_euler',frame=frame,group=name)
    for layer in action.layers:
        for action_strip in layer.strips:
            for bag in action_strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points: key.interpolation='LINEAR'
    actions[clip]=action
    track=rig.animation_data.nla_tracks.new(); track.name=clip
    strip=track.strips.new(clip,1,action); strip.blend_type='COMBINE'
    strip.extrapolation='NOTHING'
    track.mute=True
rig.animation_data.action=None
for b in rig.pose.bones: b.rotation_euler=(0,0,0)
scene.frame_set(1)

# A review-only stage lives in the new scene, never in the GLB selection.
world=bpy.data.worlds.new('Polar parrot neutral review world')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.065,.085,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.world=world
for name,location,energy,size in [('Soft key',(-2,-3,4),450,4),('Silver rim',(1,2,3),600,3),('Front fill',(-3,1,0),180,3)]:
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size
    obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); obj.location=location
    obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Polar parrot review camera')
cam=bpy.data.objects.new('Polar parrot review camera',camdata); scene.collection.objects.link(cam)
cam.location=(-2.7,-4.2,1.5); cam.rotation_euler=(Vector((.12,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.type='ORTHO'; camdata.ortho_scale=2.65; scene.camera=cam
scene.render.resolution_x=1400; scene.render.resolution_y=1000; scene.render.resolution_percentage=100

triangles=0
for obj in meshes:
    obj.data.calc_loop_triangles(); triangles+=len(obj.data.loop_triangles)
    for v in obj.data.vertices:
        assert all(math.isfinite(c) for c in v.co), obj.name
        assert v.groups and abs(sum(g.weight for g in v.groups)-1)<1e-5, obj.name
assert arm.bones.get('Head') and arm.bones.get('Spine') and arm.bones.get('Tail')
assert rig.animation_data and len(actions)==3
for img in (skin_image,normal_image,fin_image,barred_fin_image,eye_image):
    assert img.size[0]>0 and len(img.pixels)>0 and img.packed_file
assert triangles == 41772, triangles
assert len(meshes)==11 and len(arm.bones)==13
assert all(any(group.weight>0 and obj.vertex_groups[group.group].name==bone.name
               for obj in meshes for vertex in obj.data.vertices for group in vertex.groups)
           for bone in arm.bones), 'Every deform bone must have weighted vertices'
assert previous_scene in list(bpy.data.scenes), 'Original scene must remain intact'
for obj in scene.objects: obj.select_set(False)
rig.select_set(True)
for obj in meshes: obj.select_set(True)
bpy.context.view_layer.objects.active=rig
# Inspect the installed exporter RNA rather than assuming ACTIVE_ACTIONS creates clips.
export_rna=bpy.ops.export_scene.gltf.get_rna_type().properties
assert 'ACTIONS' in {i.identifier for i in export_rna['export_animation_mode'].enum_items}
export_flags=dict(export_animation_mode='ACTIONS', export_merge_animation='NONE',
                  export_force_sampling=False, export_frame_range=False,
                  export_anim_slide_to_zero=True,
                  export_optimize_animation_keep_anim_armature=False)
assert all(key in export_rna for key in export_flags)
print('EXPORT_FLAGS', export_flags)
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,
    use_active_scene=True,export_animations=True,export_yup=True,export_skins=True,
    export_materials='EXPORT',**export_flags)


def read_glb(path):
    raw=path.read_bytes()
    magic,version,length=struct.unpack_from('<III',raw)
    assert magic==0x46546c67 and version==2 and length==len(raw)
    json_length,json_type=struct.unpack_from('<II',raw,12)
    assert json_type==0x4e4f534a
    doc=json.loads(raw[20:20+json_length])
    binary_length,binary_type=struct.unpack_from('<II',raw,20+json_length)
    assert binary_type==0x004e4942
    binary=raw[28+json_length:28+json_length+binary_length]
    return doc,binary


def accessor(doc,binary,index):
    a=doc['accessors'][index]; view=doc['bufferViews'][a['bufferView']]
    widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
    formats={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}
    fmt='<'+formats[a['componentType']]*widths[a['type']]
    stride=view.get('byteStride',struct.calcsize(fmt))
    offset=view.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from(fmt,binary,offset+i*stride) for i in range(a['count'])]


def image_hashes(doc,binary):
    hashes=[]
    for img in doc['images']:
        view=doc['bufferViews'][img['bufferView']]; off=view.get('byteOffset',0)
        hashes.append(hashlib.sha256(binary[off:off+view['byteLength']]).hexdigest())
    return hashes


def geometry_hashes(doc,binary):
    # Triangle-corner POSITION/NORMAL/UV comparison is insensitive to skin-driven splits.
    result={}
    for model in doc['meshes']:
        for primitive in model['primitives']:
            attrs=primitive['attributes']
            arrays=[accessor(doc,binary,attrs[k]) for k in ('POSITION','NORMAL','TEXCOORD_0') if k in attrs]
            indices=[v[0] for v in accessor(doc,binary,primitive['indices'])]
            corners=[tuple(c for array in arrays for c in array[i]) for i in indices]
            tris=sorted(tuple(sorted(corners[i:i+3])) for i in range(0,len(corners),3))
            name=doc['materials'][primitive['material']]['name']
            result[name]=hashlib.sha256(repr(tris).encode()).hexdigest()
    return result


def validate_export():
    doc,binary=read_glb(GLB)
    baseline,baseline_binary=read_glb(ROOT/'public/models/polar-parrot-study-v1.glb')
    assert doc['materials']==baseline['materials'], 'V1 material/PBR parameters changed'
    assert doc['textures']==baseline['textures'], 'V1 texture mapping changed'
    assert image_hashes(doc,binary)==image_hashes(baseline,baseline_binary), 'V1 pixels changed'
    assert geometry_hashes(doc,binary)==geometry_hashes(baseline,baseline_binary), 'V1 rest geometry/UV changed'
    assert GLB.stat().st_size<=3*1024*1024
    assert len(doc['meshes'])==11 and len(doc['materials'])==11 and len(doc['skins'])==1
    assert len(doc['skins'][0]['joints'])==13
    assert all('camera' not in node for node in doc['nodes'])
    assert len(doc['animations'])==3 and {a['name'] for a in doc['animations']}==set(clip_frames)
    targets={}; durations={}
    for animation in doc['animations']:
        clip=animation['name']; targets[clip]=set()
        for channel in animation['channels']:
            target=channel['target']; pair=(target['node'],target['path'])
            assert pair not in targets[clip]
            targets[clip].add(pair)
            assert doc['nodes'][target['node']]['name'] in clip_bones[clip]
            assert target['path']=='rotation', 'Only disjoint bone rotations may animate'
            sampler=animation['samplers'][channel['sampler']]
            times=[v[0] for v in accessor(doc,binary,sampler['input'])]
            values=accessor(doc,binary,sampler['output'])
            assert sampler['interpolation']=='LINEAR'
            assert all(math.isfinite(c) for v in values for c in v)
            assert all(abs(sum(c*c for c in v)-1)<1e-5 for v in values)
            assert any(max(abs(a-b) for a,b in zip(v,values[0]))>1e-4 for v in values[1:]), 'Static motion channel'
            assert all(math.isfinite(t) for t in times)
            assert all(a<b for a,b in zip(times,times[1:]))
            assert abs(times[0])<1e-6, 'Loader-independent zero-based clips required'
            assert abs(times[-1]-clip_frames[clip]/30)<1e-6
            assert min(max(abs(a-b) for a,b in zip(values[0],values[-1])),
                       max(abs(a+b) for a,b in zip(values[0],values[-1])))<1e-5
            durations[clip]=times[-1]-times[0]
        assert {doc['nodes'][node]['name'] for node,_ in targets[clip]}==clip_bones[clip]
    assert all(not targets[a]&targets[b] for a,b in [('Swim','Breathing'),('Swim','FinIdle'),('Breathing','FinIdle')])
    exported_triangles=0
    for model in doc['meshes']:
        for primitive in model['primitives']:
            attrs=primitive['attributes']
            for attribute in ('POSITION','NORMAL','TEXCOORD_0','WEIGHTS_0'):
                if attribute not in attrs: continue
                assert all(math.isfinite(c) for v in accessor(doc,binary,attrs[attribute]) for c in v)
            for weights in accessor(doc,binary,attrs['WEIGHTS_0']):
                assert min(weights)>=0 and abs(sum(weights)-1)<1e-5
            for joints in accessor(doc,binary,attrs['JOINTS_0']):
                assert all(0<=joint<13 for joint in joints)
            exported_triangles+=doc['accessors'][primitive['indices']]['count']//3
    assert exported_triangles==41772
    points=[point for model in doc['meshes'] for primitive in model['primitives']
            for point in accessor(doc,binary,primitive['attributes']['POSITION'])]
    size=[max(point[axis] for point in points)-min(point[axis] for point in points) for axis in range(3)]
    assert 1.9<size[0]<2.1 and size[1]>size[2], 'Expected nose -X, exported Y-up V1 dimensions'
    assert all('skin' in node for node in doc['nodes'] if 'mesh' in node)
    assert all(math.isfinite(c) for row in accessor(doc,binary,doc['skins'][0]['inverseBindMatrices']) for c in row)
    return {'triangles':exported_triangles,'material_batches':11,'joints':13,
            'glb_bytes':GLB.stat().st_size,'rest_size_xyz':size,'clip_durations_seconds':durations,
            'clip_targets':{clip:sorted(doc['nodes'][node]['name']+'.'+path for node,path in pairs)
                            for clip,pairs in targets.items()},
            'gill_max_displacement_model_units':gill_displacement,
            'v1_materials_images_rest_position_normal_uv_equal':True,
            'v1_image_sha256':image_hashes(doc,binary), 'export_flags':export_flags}


# Blender 5.2.2's unsampled ACTIONS path ignores slide-to-zero. Normalize time only;
# keep all three clips, channels, geometry, images and skin buffers unchanged.
doc,binary=read_glb(GLB)
binary=bytearray(binary)
normalized=set()
for animation in doc['animations']:
    for sampler in animation['samplers']:
        index=sampler['input']
        if index in normalized: continue
        normalized.add(index)
        a=doc['accessors'][index]; view=doc['bufferViews'][a['bufferView']]
        values=[v[0] for v in accessor(doc,binary,index)]
        start=values[0]; offset=view.get('byteOffset',0)+a.get('byteOffset',0)
        for i,t in enumerate(values): struct.pack_into('<f',binary,offset+i*4,t-start)
        a['min']=[0.0]; a['max']=[values[-1]-start]
encoded=json.dumps(doc,separators=(',',':')).encode()
encoded+=b' '*((-len(encoded))%4)
binary+=b'\x00'*((-len(binary))%4)
GLB.write_bytes(struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+
                struct.pack('<II',len(encoded),0x4e4f534a)+encoded+
                struct.pack('<II',len(binary),0x004e4942)+binary)
metrics=validate_export()
# Neutral fixed lighting and camera; no retouching or lighting changes between phases.
scene.render.resolution_x=900; scene.render.resolution_y=650
scene.render.image_settings.file_format='PNG'
cam.location=(-.15,-4.2,.22)
cam.rotation_euler=(Vector((.12,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.ortho_scale=2.35
world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.09,.09,1)
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.render.film_transparent=False


def preview(clips,frame,name):
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks: track.mute=track.name not in clips
    for bone in rig.pose.bones: bone.rotation_euler=(0,0,0)
    scene.frame_set(frame); bpy.context.view_layer.update()
    scene.render.filepath=str(OUT/name)
    bpy.ops.render.render(write_still=True)


preview(set(),1,'review-rest.png')
for frame,label in ((1,'closed'),(16,'opening'),(31,'open'),(46,'closing')):
    preview({'Breathing'},frame,'review-breathing-'+label+'.png')
preview(set(clip_frames),30,'review-combined-frame30.png')
full_camera_location=cam.location.copy(); full_camera_rotation=cam.rotation_euler.copy()
cam.location=(-.42,-4.2,.06)
cam.rotation_euler=(Vector((-.42,0,.04))-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.ortho_scale=.95
preview({'Breathing'},1,'review-gill-closeup-closed.png')
preview({'Breathing'},31,'review-gill-closeup-open.png')
cam.location=full_camera_location; cam.rotation_euler=full_camera_rotation; camdata.ortho_scale=2.35
# Native image API + standard library only: four-phase sheet, unchanged render pixels.
from array import array
sheet=bpy.data.images.new('Four resting respiration phases',width=1800,height=1300)
pixels=array('f',[0])*(1800*1300*4)
for n,label in enumerate(('closed','opening','open','closing')):
    img=bpy.data.images.load(str(OUT/('review-breathing-'+label+'.png')),check_existing=False)
    tile=array('f',[0])*(900*650*4); img.pixels.foreach_get(tile)
    x=(n%2)*900; y=(1-n//2)*650
    for row in range(650):
        start=((y+row)*1800+x)*4
        pixels[start:start+900*4]=tile[row*900*4:(row+1)*900*4]
    bpy.data.images.remove(img)
sheet.pixels.foreach_set(pixels)
sheet.filepath_raw=str(OUT/'review-breathing-sheet.png'); sheet.file_format='PNG'; sheet.save()
bpy.data.images.remove(sheet)
# Save closed neutral rest; the three muted additive NLA tracks are ready for authoring preview.
for track in rig.animation_data.nla_tracks: track.mute=True
for bone in rig.pose.bones: bone.rotation_euler=(0,0,0)
scene.frame_set(1)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'polar-parrot-v1-animated.blend'))
assert all(hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest
           for path,digest in original_hashes.items()), 'Original V1/V2 changed'
metrics['original_file_sha256_before_and_after']=original_hashes
print('POLAR_PARROT_V1_ANIMATED_METRICS',json.dumps(metrics,sort_keys=True))
