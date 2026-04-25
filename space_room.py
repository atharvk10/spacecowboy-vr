import bpy
import math
import random

def clear_scene():
    """Clears the scene."""
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)

clear_scene()

#SPACE ROOM
world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("SpaceWorld")
    bpy.context.scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.0, 0.0, 0.0, 1.0)
    bg_node.inputs['Strength'].default_value = 0.0

#MATERIAL HELPERS
def get_material(name, color):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = color
    return mat

def get_metallic_material(name, color, metallic=1.0, roughness=0.3):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat

def get_emission_material(name, color, strength=5.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Emission Color'].default_value = color
    bsdf.inputs['Emission Strength'].default_value = strength
    return mat

#BLOCK CREATION
def create_block(name, x, y, z, sx, sy, sz, color):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx, sy, sz)
    mat = get_material("Mat_" + name, color)
    obj.data.materials.append(mat)
    return obj

def create_metallic_block(name, x, y, z, sx, sy, sz, color, metallic=1.0, roughness=0.3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx, sy, sz)
    mat = get_metallic_material("Mat_" + name, color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj

def create_emissive_block(name, x, y, z, sx, sy, sz, color, strength=5.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx, sy, sz)
    mat = get_emission_material("Mat_" + name, color, strength)
    obj.data.materials.append(mat)
    return obj

#STAR CREATION
def create_stars(count=300, spread=80):
    random.seed(42)
    star_mat = get_emission_material("Mat_Star", (1.0, 1.0, 1.0, 1.0), strength=20.0)
    for i in range(count):
        x = random.uniform(-spread, spread)
        y = random.uniform(-spread, spread)
        z = random.uniform(-spread / 2, spread)
        if abs(x - 4.5) < 15 and abs(y - 4.5) < 15 and z < 10:
            z += 20
        radius = random.uniform(0.02, 0.12)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=(x, y, z), segments=8, ring_count=6)
        star = bpy.context.active_object
        star.name = f"Star_{i}"
        star.data.materials.append(star_mat)

create_stars()

#PLANETS
def create_planet(x, y, z, radius, color, name="Planet"):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=(x, y, z), segments=64, ring_count=48)
    planet = bpy.context.active_object
    planet.name = name
    mat = get_material("Mat_" + name, color)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Roughness'].default_value = 0.8
    planet.data.materials.append(mat)
    return planet

create_planet(35, 30, 20, radius=12, color=(0.15, 0.25, 0.6, 1.0), name="Planet_Blue")
create_planet(-20, 25, 15, radius=4, color=(0.7, 0.3, 0.15, 1.0), name="Moon_Red")
create_planet(15, -30, 25, radius=3, color=(0.8, 0.8, 0.75, 1.0), name="Moon_Pale")

#SPACESHIP
def generate_spaceship():
    cx, cy = 4.5, 4.5

    hull_color = (0.06, 0.06, 0.09, 1.0)      
    panel_color_a = (0.09, 0.09, 0.12, 1.0)    
    panel_color_b = (0.13, 0.13, 0.18, 1.0)    
    accent = (0.0, 0.6, 1.0, 1.0)             
    engine_glow = (1.0, 0.4, 0.05, 1.0)        
    wing_color = (0.08, 0.08, 0.12, 1.0)       

    create_metallic_block("Hull_Center", cx, cy, -0.5, 8, 12, 0.8, hull_color, 1.0, 0.15)
    create_metallic_block("Hull_Nose", cx, cy - 7, -0.4, 4, 3, 0.6, hull_color, 1.0, 0.15)
    create_metallic_block("Hull_NoseTip", cx, cy - 9, -0.35, 2, 2, 0.4, hull_color, 1.0, 0.15)
    create_metallic_block("Hull_Rear", cx, cy + 7, -0.5, 6, 3, 0.9, hull_color, 1.0, 0.15)

    # DECK
    for i in range(10):
        for j in range(10):
            dist_from_center_y = abs(j - 4.5)
            max_half_width = 5.0 - max(0, dist_from_center_y - 3) * 1.2
            dist_from_center_x = abs(i - 4.5)
            if dist_from_center_x > max_half_width:
                continue
            if (i + j) % 2 == 0:
                color = panel_color_a
            else:
                color = panel_color_b
            create_metallic_block(f"Deck_{i}_{j}", i, j, 0.0, 0.95, 0.95, 0.05, color, 0.9, 0.25)

    create_emissive_block("CenterStrip", cx, cy, 0.03, 0.08, 10, 0.02, accent, 6.0)

    create_emissive_block("SideStrip_L", cx - 3.5, cy, 0.03, 0.06, 9, 0.02, accent, 5.0)
    create_emissive_block("SideStrip_R", cx + 3.5, cy, 0.03, 0.06, 9, 0.02, accent, 5.0)

    #RAILINGS
    rail_h = 1.0
    rail_thick = 0.08
   
    create_metallic_block("Rail_L", cx - 4.2, cy, rail_h / 2, rail_thick, 10, rail_h, hull_color, 1.0, 0.2)
    create_metallic_block("Rail_R", cx + 4.2, cy, rail_h / 2, rail_thick, 10, rail_h, hull_color, 1.0, 0.2)
    create_metallic_block("Rail_Back", cx, cy + 5.2, rail_h / 2, 8.5, rail_thick, rail_h, hull_color, 1.0, 0.2)
    create_emissive_block("RailGlow_L", cx - 4.2, cy, rail_h + 0.04, 0.12, 10, 0.04, accent, 4.0)
    create_emissive_block("RailGlow_R", cx + 4.2, cy, rail_h + 0.04, 0.12, 10, 0.04, accent, 4.0)
    create_emissive_block("RailGlow_Back", cx, cy + 5.2, rail_h + 0.04, 8.5, 0.12, 0.04, accent, 4.0)

    # COCKPIT
    create_metallic_block("Cockpit_Frame", cx, cy - 5.5, 0.8, 5, 1.5, 1.8, hull_color, 1.0, 0.15)
    create_metallic_block("Cockpit_Glass", cx, cy - 5.5, 1.0, 4.2, 0.15, 1.2,
                          (0.1, 0.2, 0.35, 1.0), 0.5, 0.05)
    create_emissive_block("Cockpit_Glow", cx, cy - 5.5, 0.05, 4.5, 1.0, 0.04, accent, 8.0)

    #CONSOLE
    create_metallic_block("Console_Base", cx, cy - 4.0, 0.5, 3, 0.6, 1.0, (0.1, 0.1, 0.14, 1.0), 1.0, 0.2)
    create_emissive_block("Console_Screen", cx, cy - 4.25, 0.85, 2.5, 0.05, 0.5, (0.0, 0.8, 0.6, 1.0), 8.0)

    # WINGS
    create_metallic_block("Wing_L", cx - 6.5, cy + 1.0, -0.3, 4, 6, 0.2, wing_color, 1.0, 0.2)
    create_metallic_block("WingTip_L", cx - 9, cy + 1.0, -0.2, 1.5, 3, 0.15, wing_color, 1.0, 0.2)
    create_metallic_block("Wing_R", cx + 6.5, cy + 1.0, -0.3, 4, 6, 0.2, wing_color, 1.0, 0.2)
    create_metallic_block("WingTip_R", cx + 9, cy + 1.0, -0.2, 1.5, 3, 0.15, wing_color, 1.0, 0.2)
    create_emissive_block("WingGlow_L", cx - 6.5, cy + 1.0, -0.15, 3.8, 0.08, 0.06, accent, 5.0)
    create_emissive_block("WingGlow_R", cx + 6.5, cy + 1.0, -0.15, 3.8, 0.08, 0.06, accent, 5.0)
    create_emissive_block("WingTipLight_L", cx - 9.8, cy + 1.0, -0.15, 0.3, 0.3, 0.15, (1.0, 0.0, 0.0, 1.0), 10.0)
    create_emissive_block("WingTipLight_R", cx + 9.8, cy + 1.0, -0.15, 0.3, 0.3, 0.15, (0.0, 1.0, 0.0, 1.0), 10.0)

    # ENGINE
    create_metallic_block("Engine_Housing", cx, cy + 7, -0.3, 7, 2.5, 1.5, hull_color, 1.0, 0.15)
    for idx, ex in enumerate([cx - 2, cx, cx + 2]):
        create_metallic_block(f"Nozzle_{idx}", ex, cy + 8.2, -0.2, 1.2, 1.0, 1.0,
                              (0.05, 0.05, 0.07, 1.0), 1.0, 0.1)
        # Engine exhaust glow
        create_emissive_block(f"Exhaust_{idx}", ex, cy + 8.8, -0.2, 0.9, 0.5, 0.8,
                              engine_glow, strength=15.0)

    # ANTENNA
    create_metallic_block("Mast", cx, cy - 3.5, 2.0, 0.1, 0.1, 2.5, hull_color, 1.0, 0.2)
    create_emissive_block("MastLight", cx, cy - 3.5, 3.3, 0.2, 0.2, 0.2, (1.0, 0.2, 0.2, 1.0), 12.0)

generate_spaceship()

#CHAIR
def create_chair(x, y, rotation_deg=0):
    bpy.ops.object.empty_add(location=(x, y, 0))
    root = bpy.context.active_object
    root.name = f"Chair_Root_{x}_{y}"

    seat_color = (0.15, 0.15, 0.2, 1.0)
    accent_color = (0.0, 0.6, 1.0, 1.0)
    leg_color = (0.2, 0.2, 0.25, 1.0)

    leg_h, leg_w = 0.5, 0.05
    seat_w, seat_th = 0.5, 0.05
    back_h = 0.5

    parts = []
    off = (seat_w / 2) - (leg_w / 2)
    leg_z = leg_h / 2

    parts.append(create_metallic_block(f"Leg_FL_{x}_{y}", x - off, y - off, leg_z, leg_w, leg_w, leg_h, leg_color))
    parts.append(create_metallic_block(f"Leg_FR_{x}_{y}", x + off, y - off, leg_z, leg_w, leg_w, leg_h, leg_color))
    parts.append(create_metallic_block(f"Leg_BL_{x}_{y}", x - off, y + off, leg_z, leg_w, leg_w, leg_h, leg_color))
    parts.append(create_metallic_block(f"Leg_BR_{x}_{y}", x + off, y + off, leg_z, leg_w, leg_w, leg_h, leg_color))

    seat_z = leg_h + (seat_th / 2)
    parts.append(create_metallic_block(f"Seat_{x}_{y}", x, y, seat_z, seat_w, seat_w, seat_th, seat_color))

    back_y = y + (seat_w / 2) - (seat_th / 2)
    back_z = leg_h + seat_th + (back_h / 2)
    parts.append(create_metallic_block(f"Back_{x}_{y}", x, back_y, back_z, seat_w, seat_th, back_h, seat_color))

    parts.append(create_emissive_block(f"SeatGlow_{x}_{y}", x, y - seat_w / 2 + 0.02, seat_z + seat_th / 2 + 0.005,
                                       seat_w, 0.03, 0.01, accent_color, strength=6.0))

    for part in parts:
        part.parent = root
        part.matrix_parent_inverse = root.matrix_world.inverted()

    root.rotation_euler[2] = math.radians(rotation_deg)

cx, cy = 4.5, 4.5
create_chair(cx, cy + 1.5, rotation_deg=0)
create_chair(cx, cy - 1.5, rotation_deg=180)
create_chair(cx + 1.5, cy, rotation_deg=270)
create_chair(cx - 1.5, cy, rotation_deg=90)

#TABLE
def create_table(x, y, width, depth, height):
    bpy.ops.object.empty_add(location=(x, y, 0))
    root = bpy.context.active_object
    root.name = f"Table_Root_{x}_{y}"

    top_color = (0.12, 0.12, 0.15, 1.0)
    leg_color = (0.2, 0.2, 0.25, 1.0)
    glow_color = (0.0, 0.6, 1.0, 1.0)

    leg_h = height
    leg_th = 0.08
    top_th = 0.10

    parts = []
    x_off = (width / 2 * 0.9) - (leg_th / 2)
    y_off = (depth / 2 * 0.9) - (leg_th / 2)
    leg_z = leg_h / 2

    parts.append(create_metallic_block(f"TLeg_FL_{x}_{y}", x - x_off, y - y_off, leg_z, leg_th, leg_th, leg_h, leg_color))
    parts.append(create_metallic_block(f"TLeg_FR_{x}_{y}", x + x_off, y - y_off, leg_z, leg_th, leg_th, leg_h, leg_color))
    parts.append(create_metallic_block(f"TLeg_BL_{x}_{y}", x - x_off, y + y_off, leg_z, leg_th, leg_th, leg_h, leg_color))
    parts.append(create_metallic_block(f"TLeg_BR_{x}_{y}", x + x_off, y + y_off, leg_z, leg_th, leg_th, leg_h, leg_color))

    top_z = leg_h + (top_th / 2)
    parts.append(create_metallic_block(f"TTop_{x}_{y}", x, y, top_z, width, depth, top_th, top_color, metallic=1.0, roughness=0.1))

    parts.append(create_emissive_block(f"TGlow_{x}_{y}", x, y, top_z + top_th / 2 + 0.005,
                                       width + 0.04, depth + 0.04, 0.01, glow_color, strength=6.0))

    for part in parts:
        part.parent = root
        part.matrix_parent_inverse = root.matrix_world.inverted()

    return root

create_table(cx, cy, width=1.6, depth=1.2, height=0.8)

#LIGHTING
bpy.ops.object.light_add(type='SUN', location=(10, 10, 20))
sun = bpy.context.active_object
sun.name = "Sun_Light"
sun.data.energy = 3.0
sun.data.color = (1.0, 0.95, 0.85)
sun.rotation_euler = (math.radians(45), math.radians(10), math.radians(-30))

bpy.ops.object.light_add(type='AREA', location=(4.5, 4.5, -2))
fill = bpy.context.active_object
fill.name = "Fill_Light"
fill.data.energy = 50.0
fill.data.color = (0.3, 0.5, 1.0)
fill.data.size = 15.0
fill.rotation_euler = (math.radians(180), 0, 0)

bpy.ops.object.light_add(type='POINT', location=(4.5, 4.5, 3.0))
table_light = bpy.context.active_object
table_light.name = "Table_Light"
table_light.data.energy = 100.0
table_light.data.color = (0.7, 0.85, 1.0)
table_light.data.shadow_soft_size = 1.0

#EXPORT SCENE INTO GLB
import os
export_path = r"C:\Users\jstnp\OneDrive\Documents\VR REALITY\final project\space_room.glb"
bpy.ops.export_scene.gltf(
    filepath=export_path,
    export_format='GLB',
    export_lights=True,
    export_materials='EXPORT',
)
print(f"Exported scene to: {export_path}")
