"""Original Polar parrot ornamental hybrid study V2; no reference photo pixels.
Run: Blender --background --factory-startup --python tools/blender/create_polar_parrot_v2.py
Only versioned V2 outputs are written. Existing named scenes are never replaced.
"""
from pathlib import Path
import hashlib
import json
import math
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/polar-parrot-v2'
GLB = ROOT / 'public/models/polar-parrot-study-v2.glb'
SCENE_NAME = 'Native Waters - Polar Parrot Realism V2'
assert SCENE_NAME not in bpy.data.scenes, 'V2 scene exists; use a separate factory-startup process.'
ORIGINALS = [ROOT / 'tools/blender/create_polar_parrot_study.py', ROOT / 'public/models/polar-parrot-study-v1.glb', *sorted((ROOT / 'artifacts/polar-parrot-study').glob('*'))]
original_hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in ORIGINALS if p.is_file()}
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 73
scene.view_settings.view_transform = 'AgX'
S = 2 / 2.62
meshes, images = [], []


def smooth(a, b, x):
    t = np.clip((x-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def bars(u, theta):
    # Independent broken boundaries, taper and islands; not repeated sinusoidal bands.
    result = np.zeros(np.broadcast_shapes(u.shape, theta.shape), dtype=np.float32)
    side = np.abs(np.sin(theta))
    for n, (center, width) in enumerate(((.275,.023),(.413,.035),(.551,.045),(.697,.036),(.814,.028),(.929,.021))):
        jag = .003*np.sin(theta*(17+n*3)+n) * np.sin(theta*31+n*2)
        drift = .025*np.cos(theta+n*.41) + .012*np.sin(theta*(2+n%3)+n*1.7)
        local_width = width*(.72+.48*np.sin(theta*2+n*1.5)+.18*np.cos(theta*7+n*2))
        boundary = smooth(-.005,.004,local_width-np.abs(u-center-drift-jag))
        gap = 1-.98*np.exp(-((theta-(1.03+n*.24))/(.090+n*.011))**2)
        gap *= 1-.82*np.exp(-((theta-(4.60-n*.18))/(.085+n*.006))**2)
        if n == 0:
            gap *= smooth(-.40,.20,np.cos(theta))
        result = np.maximum(result, boundary*gap)
    return result


def texture(name, kind, size):
    v, u = np.mgrid[0:size, 0:size].astype(np.float32)/(size-1)
    theta = v*math.tau
    grain = np.sin(u*841+np.sin(v*219))*np.sin(v*1103+u*127)
    # Small overlapping crescent scales: ~78 longitudinal columns, staggered rows.
    cu = (u*78 + (np.floor(v*116)%2)*.5)%1
    cv = (v*116)%1
    scale = np.exp(-((cv-.28-.45*(cu-.5)**2)/.085)**2)
    if kind == 'skin':
        black = bars(u,theta)
        flank = np.abs(np.sin(theta))
        back = np.clip(np.cos(theta),0,1)
        belly = np.clip(-np.cos(theta),0,1)
        rgb = np.stack((.59+.12*flank-.22*back-.09*belly,
                        .72+.12*flank-.19*back-.05*belly,
                        .76+.12*flank-.13*back-.01*belly),axis=-1)
        cyan = np.exp(-((u-.28)/.24)**2)*belly
        rgb += cyan[...,None]*np.array([-.12,.025,.08])
        rgb += (grain*.012-scale*.038)[...,None]
        rgb = rgb*(1-black[...,None]*.94)
        # Flush operculum seam painted on the same surface, with a soft cover highlight.
        x = -1.02+u*1.90
        z = np.cos(theta)
        curve = -.43+.12*(1-z*z)-.09*z
        seam = np.exp(-((x-curve)/.009)**2)*smooth(.35,.55,flank)*(1-smooth(.68,.84,np.abs(z)))
        rgb *= 1-seam[...,None]*.70
        cover = np.exp(-((x-curve+.025)/.021)**2)*smooth(.45,.70,flank)
        rgb += cover[...,None]*np.array([.025,.030,.029])
        alpha = np.ones_like(u)
    elif kind == 'normal':
        du = .10*np.sin(cu*math.tau)*scale
        dv = .15*np.cos((cv-.28)*math.tau)*scale
        rgb = np.stack((.5+du,.5+dv,np.sqrt(np.clip(1-(2*du)**2-(2*dv)**2,0,1))*.5+.5),axis=-1)
        alpha = np.ones_like(u)
    elif kind == 'roughness':
        rough = .32+.12*scale+.025*grain+.055*bars(u,theta)
        rgb = np.stack((np.ones_like(u),rough,np.zeros_like(u)),axis=-1)
        alpha = np.ones_like(u)
    elif kind in ('fin','dorsal'):
        ray = np.exp(-(np.sin(u*math.pi*32+.18*np.sin(v*5))/ .24)**2)
        ray *= (1-smooth(.75,1,v))*.75+.25
        rgb = np.stack((.28+.25*v+.105*ray,.40+.22*v+.11*ray,.44+.24*v+.12*ray),axis=-1)
        rgb += (grain*.013)[...,None]
        if kind == 'dorsal':
            black = bars((.35+1.47*u)/1.90, np.zeros_like(v))
            rgb *= 1-black[...,None]*.84
        alpha = .43+.25*(1-v)+ray*.13
        alpha *= 1-.32*smooth(.89,1,v)
    else:
        fleck = .026*np.sin(u*209+v*61)*np.sin(v*147)
        rgb = np.stack((.20+fleck,.18+fleck,.12+fleck*.7),axis=-1)
        alpha = np.ones_like(u)
    # Bounded pigment precision keeps original PNGs compact without removing scale detail.
    levels = 127 if kind == 'skin' else 63 if kind in ('fin','dorsal','roughness') else 255
    rgb = np.round(np.clip(rgb,.004,1)*levels)/levels
    alpha = np.round(alpha*63)/63
    rgba = np.concatenate((rgb,alpha[...,None]),axis=-1).astype(np.float32)
    assert np.isfinite(rgba).all()
    img = bpy.data.images.new(name,width=size,height=size,alpha=True)
    if kind in ('normal','roughness'): img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(rgba.ravel())
    img.update(); img.pack(); images.append(img)
    return img


def material(name,color,roughness=.4,tex=None,normal=None,orm=None,alpha=1):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    mat.diffuse_color=(*color,alpha)
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=roughness
    bsdf.inputs['Metallic'].default_value=0
    bsdf.inputs['Alpha'].default_value=alpha
    bsdf.inputs['IOR'].default_value=1.36
    if alpha<1:
        mat.surface_render_method='DITHERED'; mat.use_transparent_shadow=True
    def node(image):
        n=mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image=image; return n
    if tex:
        n=node(tex); mat.node_tree.links.new(n.outputs['Color'],bsdf.inputs['Base Color'])
        if alpha<1: mat.node_tree.links.new(n.outputs['Alpha'],bsdf.inputs['Alpha'])
    if normal:
        n=node(normal); nm=mat.node_tree.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value=.38
        mat.node_tree.links.new(n.outputs['Color'],nm.inputs['Color']); mat.node_tree.links.new(nm.outputs['Normal'],bsdf.inputs['Normal'])
    if orm:
        n=node(orm); sep=mat.node_tree.nodes.new('ShaderNodeSeparateColor')
        mat.node_tree.links.new(n.outputs['Color'],sep.inputs['Color']); mat.node_tree.links.new(sep.outputs['Green'],bsdf.inputs['Roughness'])
        mat.node_tree.links.new(sep.outputs['Blue'],bsdf.inputs['Metallic'])
    return mat

skin=material('V2 wet silver icy cyan skin',(.65,.78,.82),tex=texture('V2 authored scale pigment','skin',1024),normal=texture('V2 authored fine crescent normals','normal',1024),orm=texture('V2 authored packed roughness','roughness',512))
finmat=material('V2 translucent painted soft fin rays',(.4,.5,.6),.43,tex=texture('V2 authored fin membranes','fin',512),alpha=.65)
dorsalmat=material('V2 barred translucent dorsal',(.3,.4,.5),.45,tex=texture('V2 authored dorsal pigment','dorsal',512),alpha=.7)
recess=material('V2 charcoal mouth and eye surround',(.014,.022,.026),.38)
lipmat=material('V2 muted blue silver lips',(.30,.43,.45),.36)
iris=material('V2 subtle dark bronze iris',(.2,.18,.12),.26,tex=texture('V2 authored iris flecks','eye',256))
pupil=material('V2 wet dark pupil',(.003,.006,.009),.11)


def mesh(name,verts,faces,mat,uvs=None):
    data=bpy.data.meshes.new(name); data.from_pydata([tuple(Vector(p)*S) for p in verts],[],faces); data.update()
    obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); data.materials.append(mat)
    for p in data.polygons: p.use_smooth=True
    if uvs:
        layer=data.uv_layers.new()
        for p in data.polygons:
            for li in p.loop_indices: layer.data[li].uv=uvs[data.loops[li].vertex_index]
    meshes.append(obj); return obj

# Short blunt snout, steep forehead / nuchal hump, broad compressed trunk.
profile=[(-1.04,.012,.006,-.185),(-1.02,.092,.048,-.18),(-.94,.24,.107,-.115),(-.80,.44,.168,-.035),(-.60,.61,.207,.028),(-.35,.69,.227,.030),(-.05,.675,.220,.003),(.26,.55,.184,-.025),(.51,.355,.126,-.043),(.73,.174,.076,-.030),(.88,.12,.057,-.020)]

def section(x):
    for i,(a,b) in enumerate(zip(profile,profile[1:])):
        if a[0]<=x<=b[0]:
            t=(x-a[0])/(b[0]-a[0]); span=b[0]-a[0]
            prev=profile[max(0,i-1)]; nxt=profile[min(len(profile)-1,i+2)]
            return tuple((2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*span*(b[k]-prev[k])/(b[0]-prev[0])+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*span*(nxt[k]-a[k])/(nxt[0]-a[0]) for k in (1,2,3))
    return profile[0][1:] if x<profile[0][0] else profile[-1][1:]

vv,ff,uv=[],[],[]
NX,NT=80,96
for i in range(NX+1):
    x=-1.04+1.92*i/NX; h,d,z=section(x)
    for j in range(NT+1):
        a=math.tau*j/NT
        vv.append((x,d*math.sin(a),z+h*math.cos(a))); uv.append(((x+1.02)/1.90,j/NT))
for i in range(NX):
    for j in range(NT):
        k=i*(NT+1)+j; ff.append((k,k+NT+1,k+NT+2,k+1))
ff += [tuple(range(NT,-1,-1)),tuple(NX*(NT+1)+j for j in range(NT+1))]
mesh('V2 compressed hump body',vv,ff,skin,uv)


def ellipsoid(name,c,r,mat,segments=32,rings=12):
    vv,ff,uv=[],[],[]
    for i in range(rings+1):
        a=math.pi*i/rings
        for j in range(segments+1):
            b=math.tau*j/segments
            vv.append((c[0]+r[0]*math.sin(a)*math.cos(b),c[1]+r[1]*math.sin(a)*math.sin(b),c[2]+r[2]*math.cos(a))); uv.append((j/segments,i/rings))
    for i in range(rings):
        for j in range(segments):
            k=i*(segments+1)+j; ff.append((k,k+1,k+segments+2,k+segments+1))
    return mesh(name,vv,ff,mat,uv)

for sign,side in ((-1,'L'),(1,'R')):
    # Conform each ring to cheek curvature; glossy pupil is the shallow corneal lens.
    for label,inner,outer,mat in [('surround',.056,.070,recess),('iris',.041,.056,iris),('corneal pupil',0,.041,pupil)]:
        vv,ff,uv=[],[],[]
        rings,segments=8,48
        for i in range(rings+1):
            radius=inner+(outer-inner)*i/rings
            for j in range(segments+1):
                a=math.tau*j/segments; x=-.750+radius*math.cos(a); z=.193+radius*1.04*math.sin(a)
                h,d,zc=section(x); y=d*math.sqrt(max(0,1-((z-zc)/h)**2))
                lens=.004+.005*max(0,1-(radius/.070)**2)
                vv.append((x,sign*(y+lens),z)); uv.append((.5+radius/.14*math.cos(a),.5+radius/.14*math.sin(a)))
        for i in range(rings):
            for j in range(segments):
                k=i*(segments+1)+j
                face=(k,k+1,k+segments+2,k+segments+1)
                ff.append(tuple(reversed(face)) if sign==-1 else face)
        mesh('V2 flush '+label+' '+side,vv,ff,mat,uv)
ellipsoid('V2 closed mouth recess',(-1.043,0,-.185),(.004,.026,.004),recess,24,8)
ellipsoid('V2 upper closed lip',(-1.039,0,-.176),(.008,.029,.006),lipmat,24,8)
ellipsoid('V2 lower closed lip',(-1.039,0,-.194),(.008,.027,.006),lipmat,24,8)


def fin(name,roots,tips,mat=finmat,bone=''):
    vv,ff,uv=[],[],[]; rows=12
    for i,(root,tip) in enumerate(zip(roots,tips)):
        for j in range(rows+1):
            t=j/rows; p=Vector(root).lerp(Vector(tip),t)
            p.y += .009*math.sin(t*math.pi)*math.sin(i*.55)
            vv.append(p); uv.append((i/(len(roots)-1),t))
    for i in range(len(roots)-1):
        for j in range(rows):
            k=i*(rows+1)+j; ff.append((k,k+rows+1,k+rows+2,k+1))
    obj=mesh(name,vv,ff,mat,uv); obj['fin_bone']=bone
    return obj

roots,tips=[],[]
for i in range(49):
    t=i/48; x=-.70+1.49*t; h,d,z=section(x)
    root=(x,0,z+h*.985)
    lift=.025+.155*math.sin(math.pi*t)**.55+.14*math.exp(-((t-.78)/.17)**2)
    # Rounded scallops, no wire geometry or needle tips.
    lift+=.009*(1-math.cos(t*math.tau*14))
    roots.append(root); tips.append((x+.10*math.sin(math.pi*t),0,root[2]+lift))
fin('V2 rounded dorsal spines',roots,tips,dorsalmat)
roots,tips=[],[]
for i in range(37):
    t=i/36; x=-.19+.97*t; h,d,z=section(x)
    roots.append((x,0,z-h*.98)); tips.append((x+.12*math.sin(math.pi*t),0,z-h-.21*math.sin(math.pi*t)**.8-.008))
fin('V2 rounded anal membrane',roots,tips)
roots,tips=[],[]
for i in range(41):
    t=i/40; a=-1+2*t
    roots.append((.80+.09*(1-a*a),0,-.025+.111*a))
    tips.append((1.60-.42*abs(a)**2.2,0,-.025+.365*math.sin(a*math.pi/2)))
fin('V2 rounded caudal fan',roots,tips,bone='Tail')
for sign,side in ((-1,'L'),(1,'R')):
    roots,tips=[],[]
    for i in range(25):
        t=i/24
        roots.append((-.38+.065*t,sign*.210,-.14-.07*t))
        tips.append((-.08+.16*math.sin(math.pi*t),sign*(.26+.10*math.sin(math.pi*t)),-.13-.36*t))
    fin('V2 soft pectoral '+side,roots,tips,bone='Pectoral.'+side)
    roots,tips=[],[]
    for i in range(17):
        t=i/16
        roots.append((-.40+.12*t,sign*.075,-.53-.035*t))
        tips.append((-.16+.25*t,sign*(.10+.035*math.sin(math.pi*t)),-.76+.17*t))
    fin('V2 tapered pelvic '+side,roots,tips)

arm=bpy.data.armatures.new('V2 five bone swim skeleton'); rig=bpy.data.objects.new('PolarParrotV2Rig',arm); scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
for name,head,tail,parent in [('Head',(-.8,0,0),(-.4,0,0),None),('Spine',(-.4,0,0),(.45,0,0),'Head'),('Tail',(.45,0,0),(1.5,0,0),'Spine'),('Pectoral.L',(-.37,-.21,-.14),(-.01,-.35,-.3),'Spine'),('Pectoral.R',(-.37,.21,-.14),(-.01,.35,-.3),'Spine')]:
    b=arm.edit_bones.new(name); b.head=Vector(head)*S; b.tail=Vector(tail)*S
    if parent: b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for obj in meshes:
    obj.parent=rig; groups={b.name:obj.vertex_groups.new(name=b.name) for b in arm.bones}
    named=obj.get('fin_bone','')
    for v in obj.data.vertices:
        x=v.co.x/S
        if named.startswith('Pectoral'):
            # The attachment stays on trunk; outer membrane gradually follows fin bone.
            t=obj.data.uv_layers.active.data[next(l.index for l in obj.data.loops if l.vertex_index==v.index)].uv.y
            w=.18+.82*t; weights={named:w,'Spine':1-w}
        elif named=='Tail':
            w=max(0,min(1,(x-.60)/.48)); weights={'Spine':1-w,'Tail':w}
        elif x<-.35:
            t=max(0,min(1,(x+.65)/.30)); weights={'Head':1-t,'Spine':t}
        else:
            t=max(0,min(1,(x-.38)/.55)); weights={'Spine':1-t,'Tail':t}
        for name,w in weights.items():
            if w>0: groups[name].add([v.index],w,'REPLACE')
    mod=obj.modifiers.new('V2 normalized swim deformation','ARMATURE'); mod.object=rig
for mat in (skin,finmat,dorsalmat,recess,lipmat,iris,pupil):
    batch=[o for o in scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
    if len(batch)>1:
        for o in scene.objects: o.select_set(False)
        for o in batch: o.select_set(True)
        bpy.context.view_layer.objects.active=batch[0]; bpy.ops.object.join()
meshes=[o for o in scene.objects if o.type=='MESH']
for b in rig.pose.bones: b.rotation_mode='XYZ'
for frame in range(1,74,3):
    phase=math.tau*(frame-1)/72
    for name,angle in [('Head',0),('Spine',.008*math.sin(phase)),('Tail',.10*math.sin(phase)),('Pectoral.L',.13*math.sin(phase)),('Pectoral.R',-.12*math.sin(phase))]:
        b=rig.pose.bones[name]; b.rotation_euler=(0,0,angle); b.keyframe_insert(data_path='rotation_euler',frame=frame,group=name)
rig.animation_data.action.name='Polar parrot V2 - calm three second swim'
scene.frame_set(1)
assert all(abs(c)<1e-8 for b in rig.pose.bones for c in b.rotation_euler)
assert rig.matrix_world == rig.matrix_world.Identity(4)
triangles=0
for obj in meshes:
    obj.data.calc_loop_triangles(); triangles+=len(obj.data.loop_triangles)
    for v in obj.data.vertices:
        assert all(math.isfinite(c) for c in v.co)
        assert v.groups and all(g.weight>=0 for g in v.groups) and abs(sum(g.weight for g in v.groups)-1)<1e-5
assert 20000<=triangles<=41772,triangles
assert len(meshes)<=11
for img in images:
    assert img.packed_file and img.size[0]==img.size[1] and img.size[0]<=1024
    assert img.size[0]<=512 or img.name in ('V2 authored scale pigment','V2 authored fine crescent normals')
for o in scene.objects: o.select_set(False)
rig.select_set(True)
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,export_force_sampling=True,export_yup=True,export_skins=True,export_materials='EXPORT')
assert GLB.stat().st_size<=3*1024*1024,GLB.stat().st_size

# Bright neutral review stage is deliberately excluded from the GLB.
world=bpy.data.worlds.new('V2 neutral gray review'); world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.21,.23,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65; scene.world=world
for name,loc,power,size in [('V2 broad key',(-2,-4,3),400,4),('V2 soft fill',(1,-2,-1),110,3),('V2 rear softbox',(1,3,2),350,4)]:
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.size=size
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob); ob.location=loc
    ob.rotation_euler=(-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('V2 reference camera'); cam=bpy.data.objects.new('V2 reference camera',data); scene.collection.objects.link(cam); scene.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=2.65
scene.render.resolution_x=1400; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for name,loc in [('side',(0,-5,.05)),('three-quarter',(-2.3,-5,1.0))]:
    cam.location=loc; cam.rotation_euler=(Vector((.10,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'review-{name}.png'); bpy.ops.render.render(write_still=True)
# Second side frame exposes deformation rather than hiding it with an oblique stage.
scene.frame_set(19); cam.location=(0,-5,.05); cam.rotation_euler=(Vector((.10,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(OUT/'review-swim-frame19.png'); bpy.ops.render.render(write_still=True); scene.frame_set(1)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'polar-parrot-v2.blend'))
assert original_hashes=={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in original_hashes},'Original assets changed'
metrics={'triangles':triangles,'batches':len(meshes),'bones':len(arm.bones),'clips':1,'bytes':GLB.stat().st_size,'textures':[(im.name,list(im.size)) for im in images],'length_model_units':max(v.co.x for o in meshes for v in o.data.vertices)-min(v.co.x for o in meshes for v in o.data.vertices),'fps':24,'loop_seconds':3,'source_checks':'finite geometry, normalized nonnegative weights, identity rig / rest pose, packed texture sizes, triangle and payload budgets, original hashes preserved','original_sha256':original_hashes}
print('POLAR_PARROT_V2_METRICS '+json.dumps(metrics))
