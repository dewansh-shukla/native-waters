"""Polar parrot reference study. Run inside Blender with the output directories prepared.
Safe-mode compatible: no filesystem reads, external images, add-ons, or scene deletion.
"""
import bpy
import math
from mathutils import Vector

ROOT = '/Users/dewanshshukla/Desktop/Personal/SAAS/native-indian-fishes'
SCENE_NAME = 'Native Waters - Polar Parrot Study'
assert SCENE_NAME not in bpy.data.scenes, 'Study exists: inspect it before explicitly retrying.'
previous_scene = bpy.context.scene
scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 73
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

arm=bpy.data.armatures.new('Polar parrot swim skeleton')
rig=bpy.data.objects.new('PolarParrotRig',arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name,head,tail,parent in [('Head',(-.8,0,0),(-.4,0,0),None),('Spine',(-.4,0,0),(.45,0,0),'Head'),('Tail',(.45,0,0),(1.5,0,0),'Spine'),('Pectoral.L',(-.37,-.22,-.12),(-.01,-.43,-.3),'Spine'),('Pectoral.R',(-.37,.22,-.12),(-.01,.43,-.3),'Spine')]:
    bone=arm.edit_bones.new(name)
    bone.head=Vector(head)*S; bone.tail=Vector(tail)*S
    if parent: bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for obj in meshes:
    obj.parent=rig
    groups={name:obj.vertex_groups.new(name=name) for name in ('Head','Spine','Tail','Pectoral.L','Pectoral.R')}
    named=obj.get('fin_bone','')
    for v in obj.data.vertices:
        x=v.co.x/S
        if named:
            weights={named:1.0}
        elif x < -.35:
            t=max(0,min(1,(x+.65)/.30)); weights={'Head':1-t,'Spine':t}
        else:
            t=max(0,min(1,(x-.20)/.55)); weights={'Spine':1-t,'Tail':t}
        for name,w in weights.items():
            if w>0: groups[name].add([v.index],w,'REPLACE')
    mod=obj.modifiers.new('Smooth swim deformation','ARMATURE'); mod.object=rig

# Consolidate shared materials after weighting to avoid dozens of ray draw calls.
for mat in (skin,finmat,barredfinmat,raymat,gillmat,lipmat,mouthmat,eyeouter,irismat,pupilmat,corneamat):
    batch=[o for o in scene.objects if o.type=='MESH' and o.data.materials[0] == mat]
    if len(batch)>1:
        for o in scene.objects: o.select_set(False)
        for o in batch: o.select_set(True)
        bpy.context.view_layer.objects.active=batch[0]
        bpy.ops.object.join()
meshes=[o for o in scene.objects if o.type=='MESH']
for bone in rig.pose.bones: bone.rotation_mode='XYZ'
for frame in range(1,74,6):
    phase=math.tau*(frame-1)/72
    for name,angle in [('Head',.008*math.sin(phase)),('Spine',.045*math.sin(phase)),('Tail',.13*math.sin(phase-.6)),('Pectoral.L',.12*math.sin(phase+.9)),('Pectoral.R',.12*math.sin(phase+2.1))]:
        bone=rig.pose.bones[name]
        bone.rotation_euler=(0,0,angle)
        bone.keyframe_insert(data_path='rotation_euler',frame=frame,group=name)
rig.animation_data.action.name='Polar parrot - calm three second swim'
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
assert rig.animation_data and rig.animation_data.action
for img in (skin_image,normal_image,fin_image,barred_fin_image,eye_image):
    assert img.size[0]>0 and len(img.pixels)>0 and img.packed_file
assert 20000 <= triangles <= 45000, triangles
assert previous_scene in list(bpy.data.scenes), 'Original scene must remain intact'
for obj in scene.objects: obj.select_set(False)
rig.select_set(True)
for obj in meshes: obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/models/polar-parrot-study-v1.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,export_force_sampling=True,export_yup=True,export_skins=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/artifacts/polar-parrot-study/polar-parrot-study.blend')
print('POLAR_PARROT_METRICS', {'meshes':len(meshes),'triangles':triangles,'bones':len(arm.bones),'textures':[(img.name,tuple(img.size)) for img in (skin_image,normal_image,fin_image,barred_fin_image,eye_image)],'length':2.0,'frames':73,'fps':24,'original_scene_preserved':previous_scene.name})
