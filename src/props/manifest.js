import { assets } from '../core/assets.js';

// ---------------------------------------------------------------------------
// Prop asset manifest.  (owner: fable3)
//
// Every prop the populator can place is registered here with the full record
// shape documented in src/core/assets.js. The QA gallery and the manifest
// audit test read this registry.
// ---------------------------------------------------------------------------

const FILES = ['src/props/library.js', 'src/props/populate.js'];

// [id, name, category, dims(w,h,d), collision, rooms, materials, extra]
const CATALOG = [
  // ---- office furniture --------------------------------------------------
  ['PROP-DESK-STD', 'Standard Desk 1600', 'furniture', [1.6, 0.735, 0.8], 'box', ['openoffice', 'itroom', 'vestibule'], ['laminate', 'paintedMetal'], {}],
  ['PROP-DESK-EXEC', 'Executive Desk', 'furniture', [1.9, 0.735, 0.95], 'box', ['execoffice'], ['woodVeneer', 'leather', 'aluminum'], {}],
  ['PROP-DESK-RECEPTION', 'Reception Desk (curved)', 'furniture', [2.7, 1.1, 1.6], 'compound', ['lobby'], ['woodVeneer', 'laminate', 'brand'], {}],
  ['PROP-CUBE-PANEL-LOW', 'Cubicle Panel 1600x1200', 'furniture', [1.6, 1.2, 0.06], 'box', ['openoffice'], ['fabricPanel', 'aluminum'], { lod: 'instanced' }],
  ['PROP-CUBE-PANEL-HIGH', 'Cubicle Panel 1600x1600', 'furniture', [1.6, 1.6, 0.06], 'box', ['openoffice'], ['fabricPanel', 'aluminum'], { lod: 'instanced' }],
  ['PROP-CUBE-PANEL-SIDE', 'Cubicle Panel 800x1200', 'furniture', [0.8, 1.2, 0.06], 'box', ['openoffice'], ['fabricPanel', 'aluminum'], { lod: 'instanced' }],
  ['PROP-CUBE-POST', 'Cubicle Connector Post', 'furniture', [0.08, 1.2, 0.08], 'box', ['openoffice'], ['aluminum'], { lod: 'instanced' }],
  ['PROP-TABLE-CONF', 'Boat Conference Table 3.2m', 'furniture', [3.2, 0.77, 1.32], 'box', ['conference'], ['woodVeneer', 'paintedMetal'], {}],
  ['PROP-CHAIR-TASK', 'Task Chair (5-star, mesh)', 'furniture', [0.56, 1.0, 0.56], 'box', ['openoffice', 'itroom', 'vestibule'], ['fabricChair', 'plastic', 'chrome'], { lod: 'instanced' }],
  ['PROP-CHAIR-CONF', 'Conference Chair (cantilever)', 'furniture', [0.52, 0.98, 0.55], 'box', ['conference', 'execoffice'], ['fabricChair', 'chrome'], { lod: 'instanced' }],
  ['PROP-CHAIR-SLED', 'Waiting Chair (sled base)', 'furniture', [0.55, 0.92, 0.52], 'box', ['waiting', 'lobby'], ['fabricPanel', 'paintedMetal'], { lod: 'instanced' }],
  ['PROP-CHAIR-STACK', 'Stacking Chair', 'furniture', [0.48, 0.88, 0.48], 'box', ['breakroom'], ['plastic', 'aluminum'], { lod: 'instanced' }],
  ['PROP-SOFA-3', 'Three-Seat Sofa', 'furniture', [2.24, 0.84, 0.85], 'box', ['lobby'], ['leather'], {}],
  ['PROP-TABLE-SIDE', 'Side Table', 'furniture', [0.6, 0.5, 0.6], 'box', ['lobby', 'waiting', 'execcorr'], ['woodVeneer', 'paintedMetal'], {}],
  ['PROP-TABLE-BREAK', 'Break Table (round)', 'furniture', [1.0, 0.74, 1.0], 'box', ['breakroom'], ['laminate', 'paintedMetal'], {}],
  ['PROP-CAB-FILE-2', 'Filing Cabinet, 2 drawer', 'furniture', [0.47, 0.72, 0.62], 'box', ['openoffice', 'itroom'], ['paintedMetal', 'aluminum'], {}],
  ['PROP-CAB-FILE-4', 'Filing Cabinet, 4 drawer', 'furniture', [0.47, 1.32, 0.62], 'box', ['openoffice', 'copyroom', 'execoffice'], ['paintedMetal', 'aluminum'], {}],
  ['PROP-PEDESTAL', 'Pedestal Drawer Unit', 'furniture', [0.4, 0.64, 0.55], 'box', ['openoffice', 'itroom'], ['paintedMetal'], { lod: 'instanced' }],
  ['PROP-SHELF-OPEN', 'Open Shelving Unit', 'furniture', [0.8, 1.8, 0.35], 'box', ['copyroom', 'itroom', 'janitor'], ['laminate'], {}],
  ['PROP-RACK-ARCHIVE', 'Archive Rack Bay (box files)', 'furniture', [2.48, 2.1, 0.62], 'box', ['archive'], ['paintedMetal', 'paper'], {}],
  ['PROP-BOOKCASE', 'Bookcase', 'furniture', [0.9, 1.9, 0.34], 'box', ['execoffice', 'execcorr', 'conference'], ['woodVeneer', 'paper'], {}],
  ['PROP-COATRACK', 'Coat Rack', 'furniture', [0.4, 1.72, 0.4], 'box', ['openoffice', 'execoffice'], ['paintedMetal'], {}],
  // ---- electronics -------------------------------------------------------
  ['ELEC-TOWER', 'Computer Tower', 'electronics', [0.19, 0.42, 0.45], 'box', ['openoffice', 'itroom'], ['plastic'], { lod: 'instanced' }],
  ['ELEC-MONITOR-24', '24in Monitor (powered)', 'electronics', [0.56, 0.53, 0.18], 'none', ['openoffice', 'itroom', 'vestibule'], ['plastic', 'screen-emissive'], { lod: 'instanced' }],
  ['ELEC-MONITOR-24-OFF', '24in Monitor (unpowered)', 'electronics', [0.56, 0.53, 0.18], 'none', ['openoffice', 'itroom'], ['plastic', 'screen-off'], { lod: 'instanced' }],
  ['ELEC-MONITOR-DUAL', 'Dual Monitor Arm Setup', 'electronics', [1.16, 0.6, 0.2], 'none', ['itroom', 'vestibule'], ['plastic', 'screen-emissive'], {}],
  ['ELEC-KEYBOARD', 'Keyboard', 'electronics', [0.44, 0.03, 0.15], 'none', ['openoffice', 'itroom'], ['plastic'], { lod: 'instanced' }],
  ['ELEC-MOUSE', 'Mouse', 'electronics', [0.06, 0.04, 0.1], 'none', ['openoffice', 'itroom'], ['plastic'], { lod: 'instanced' }],
  ['ELEC-MOUSEPAD', 'Mouse Pad', 'electronics', [0.26, 0.004, 0.22], 'none', ['openoffice'], ['rubber'], { lod: 'instanced' }],
  ['ELEC-LAPTOP-OPEN', 'Laptop (open)', 'electronics', [0.34, 0.24, 0.24], 'none', ['execoffice', 'conference'], ['aluminum', 'screen-emissive'], {}],
  ['ELEC-LAPTOP-CLOSED', 'Laptop (closed)', 'electronics', [0.34, 0.03, 0.24], 'none', ['openoffice', 'conference'], ['aluminum'], {}],
  ['ELEC-PHONE', 'Desk Phone', 'electronics', [0.24, 0.09, 0.19], 'none', ['openoffice', 'conference', 'execoffice'], ['plastic'], { lod: 'instanced' }],
  ['ELEC-HEADSET', 'Headset on Stand', 'electronics', [0.17, 0.15, 0.1], 'none', ['openoffice', 'vestibule'], ['plastic'], {}],
  ['ELEC-DOCK', 'Docking Station', 'electronics', [0.22, 0.05, 0.09], 'none', ['openoffice', 'itroom'], ['plastic'], {}],
  ['ELEC-PRINTER-DESK', 'Desktop Printer', 'electronics', [0.46, 0.3, 0.38], 'box', ['openoffice', 'execoffice'], ['plastic', 'paper'], {}],
  ['ELEC-COPIER', 'Floor Copier', 'electronics', [1.1, 1.1, 0.64], 'box', ['copyroom', 'openoffice'], ['plastic', 'screen-emissive'], {}],
  ['ELEC-PAPERTRAY', 'Paper Tray', 'electronics', [0.26, 0.09, 0.33], 'none', ['copyroom', 'openoffice'], ['plastic', 'paper'], {}],
  ['ELEC-PROJECTOR', 'Projector', 'electronics', [0.32, 0.12, 0.24], 'none', ['conference'], ['plastic'], {}],
  ['ELEC-DISPLAY-WALL', 'Wall Conference Display 65in', 'electronics', [1.46, 0.85, 0.09], 'none', ['conference'], ['plastic', 'screen-emissive'], {}],
  ['ELEC-WHITEBOARD', 'Whiteboard (marker notes)', 'electronics', [1.84, 1.24, 0.06], 'none', ['conference', 'openoffice', 'itroom'], ['aluminum', 'whiteboard'], {}],
  ['ELEC-CLOCK', 'Wall Clock (08:12)', 'electronics', [0.34, 0.34, 0.04], 'none', ['many'], ['plastic'], { lod: 'instanced' }],
  ['ELEC-SECMONITORS', 'Security Monitor Bank', 'electronics', [0.98, 0.8, 0.36], 'box', ['vestibule'], ['plastic', 'screen-emissive'], { anims: ['static'] }],
  ['ELEC-RACK-42U', 'Server Rack 42U', 'electronics', [0.62, 2.02, 1.02], 'box', ['serverroom'], ['paintedMetal', 'led-emissive'], { lod: 'instanced' }],
  ['ELEC-SWITCH', 'Network Switch 1U', 'electronics', [0.44, 0.05, 0.24], 'none', ['itroom', 'serverroom'], ['paintedMetal', 'led-emissive'], {}],
  ['ELEC-UPS', 'UPS Unit', 'electronics', [0.26, 0.42, 0.6], 'box', ['serverroom'], ['paintedMetal', 'led-emissive'], {}],
  ['ELEC-CABLE-BUNDLE', 'Cable Bundle', 'electronics', [1.2, 0.04, 0.06], 'none', ['serverroom', 'itroom'], ['plastic'], { lod: 'instanced' }],
  ['ELEC-CABLE-LOOSE', 'Loose Floor Cable', 'electronics', [0.9, 0.02, 0.2], 'none', ['itroom', 'openoffice'], ['plastic'], { lod: 'instanced' }],
  // ---- break room ----------------------------------------------------------
  ['BREAK-CAB-BASE', 'Kitchen Base Cabinet', 'breakroom', [0.6, 0.76, 0.6], 'box', ['breakroom'], ['laminate'], { lod: 'instanced' }],
  ['BREAK-CAB-WALL', 'Kitchen Wall Cabinet', 'breakroom', [0.6, 0.7, 0.34], 'none', ['breakroom'], ['laminate'], { lod: 'instanced' }],
  ['BREAK-COUNTER-SINK', 'Countertop with Sink', 'breakroom', [1.8, 0.95, 0.64], 'box', ['breakroom'], ['laminate', 'stainless', 'chrome'], {}],
  ['BREAK-FRIDGE', 'Refrigerator', 'breakroom', [0.72, 1.8, 0.72], 'box', ['breakroom'], ['stainless'], {}],
  ['BREAK-MICROWAVE', 'Microwave', 'breakroom', [0.5, 0.3, 0.38], 'none', ['breakroom'], ['plastic', 'led-emissive'], {}],
  ['BREAK-COFFEE', 'Drip Coffee Machine + Carafe', 'breakroom', [0.22, 0.36, 0.3], 'none', ['breakroom'], ['plastic', 'glass'], {}],
  ['BREAK-KETTLE', 'Electric Kettle', 'breakroom', [0.19, 0.24, 0.19], 'none', ['breakroom'], ['stainless'], {}],
  ['BREAK-VENDING', 'Vending Machine "Polar Pantry"', 'breakroom', [0.95, 1.83, 0.8], 'box', ['breakroom', 'midcorr'], ['paintedMetal', 'glass', 'screen-emissive'], {}],
  ['BREAK-WATERCOOLER', 'Water Cooler with Bottle', 'breakroom', [0.36, 1.4, 0.36], 'box', ['openoffice', 'breakroom'], ['plastic', 'glass'], {}],
  ['BREAK-MUG', 'Ceramic Mug', 'breakroom', [0.09, 0.1, 0.09], 'none', ['breakroom', 'openoffice'], ['ceramic'], { lod: 'instanced' }],
  ['BREAK-CUP-PAPER', 'Paper Cup', 'breakroom', [0.08, 0.12, 0.08], 'none', ['breakroom', 'openoffice'], ['paper'], { lod: 'instanced' }],
  ['BREAK-PLATE', 'Plate', 'breakroom', [0.22, 0.02, 0.22], 'none', ['breakroom'], ['ceramic'], { lod: 'instanced' }],
  ['BREAK-FOODBOX', 'Food Container', 'breakroom', [0.18, 0.08, 0.13], 'none', ['breakroom'], ['plastic'], { lod: 'instanced' }],
  ['BREAK-SNACK', 'Snack Packet', 'breakroom', [0.09, 0.13, 0.05], 'none', ['breakroom'], ['plastic'], { lod: 'instanced' }],
  ['BREAK-BIN-TRASH', 'Trash Bin', 'breakroom', [0.4, 0.58, 0.4], 'box', ['many'], ['plastic'], { lod: 'instanced' }],
  ['BREAK-BIN-RECYCLE', 'Recycling Bin', 'breakroom', [0.4, 0.58, 0.4], 'box', ['many'], ['plastic'], { lod: 'instanced' }],
  ['BREAK-TOWEL-DISP', 'Paper Towel Dispenser', 'breakroom', [0.29, 0.38, 0.12], 'none', ['breakroom', 'restrooms'], ['plastic', 'paper'], {}],
  ['BREAK-SOAP-DISP', 'Soap Dispenser', 'breakroom', [0.11, 0.17, 0.11], 'none', ['breakroom', 'restrooms'], ['plastic'], {}],
  ['BREAK-NOTICEBOARD', 'Cork Notice Board (pinned)', 'breakroom', [1.24, 0.94, 0.05], 'none', ['breakroom', 'midcorr'], ['cork', 'wood', 'paper'], {}],
  // ---- restroom ------------------------------------------------------------
  ['REST-SINK', 'Wall-hung Sink + P-trap', 'restroom', [0.52, 1.0, 0.46], 'box', ['restrooms'], ['porcelain', 'chrome'], {}],
  ['REST-MIRROR', 'Mirror', 'restroom', [0.56, 0.8, 0.03], 'none', ['restrooms'], ['aluminum', 'mirror'], {}],
  ['REST-TOILET', 'Toilet', 'restroom', [0.44, 0.8, 0.66], 'box', ['restrooms'], ['porcelain', 'chrome'], {}],
  ['REST-URINAL', 'Urinal', 'restroom', [0.36, 0.62, 0.32], 'box', ['restrooms'], ['porcelain', 'chrome'], {}],
  ['REST-STALL-PANEL', 'Stall Partition Panel', 'restroom', [0.05, 1.85, 1.5], 'box', ['restrooms'], ['paintedMetal', 'chrome'], {}],
  ['REST-STALL-DOOR', 'Stall Door', 'restroom', [0.66, 1.85, 0.06], 'box', ['restrooms'], ['paintedMetal', 'chrome'], {}],
  ['REST-HANDDRYER', 'Hand Dryer', 'restroom', [0.26, 0.32, 0.17], 'none', ['restrooms'], ['stainless', 'led-emissive'], {}],
  ['REST-BIN', 'Small Steel Bin', 'restroom', [0.27, 0.37, 0.27], 'box', ['restrooms', 'execoffice'], ['stainless'], { lod: 'instanced' }],
  // ---- maintenance & loading ------------------------------------------------
  ['MAINT-ELECPANEL', 'Electrical Panel (closed)', 'maintenance', [0.6, 0.9, 0.2], 'none', ['mechanical', 'garage'], ['paintedMetal'], {}],
  ['MAINT-BREAKERBOX', 'Breaker Box (door open)', 'maintenance', [0.4, 0.62, 0.15], 'none', ['mechanical', 'servicecorr'], ['paintedMetal', 'breaker-face'], {}],
  ['MAINT-TRANSFORMER', 'Utility Cabinet / Transformer', 'maintenance', [0.9, 1.5, 0.62], 'box', ['mechanical'], ['paintedMetal', 'led-emissive'], {}],
  ['MAINT-PIPES', 'Pipe Assembly with Valves', 'maintenance', [0.9, 2.2, 0.24], 'box', ['mechanical', 'garage'], ['stainless', 'paintedMetal'], {}],
  ['MAINT-AHU', 'HVAC Air Handler', 'maintenance', [1.7, 1.98, 0.92], 'box', ['mechanical'], ['paintedMetal', 'aluminum'], {}],
  ['MAINT-DUCT', 'Duct Branch', 'maintenance', [2.4, 0.37, 0.5], 'none', ['mechanical', 'loading'], ['aluminum'], {}],
  ['MAINT-EXTINGUISHER', 'Fire Extinguisher + Bracket', 'maintenance', [0.16, 0.6, 0.18], 'none', ['many'], ['paintedMetal', 'chrome'], { lod: 'instanced' }],
  ['MAINT-FIRECABINET', 'Recessed Fire Cabinet', 'maintenance', [0.42, 0.72, 0.22], 'none', ['midcorr', 'servicecorr', 'loading'], ['paintedMetal', 'glass'], {}],
  ['MAINT-SPRINKLER', 'Sprinkler Head', 'maintenance', [0.08, 0.07, 0.08], 'none', ['ceilings'], ['chrome'], { lod: 'instanced' }],
  ['MAINT-SMOKEDET', 'Smoke Detector', 'maintenance', [0.12, 0.04, 0.12], 'none', ['ceilings'], ['plastic', 'led-emissive'], { lod: 'instanced' }],
  ['MAINT-JANITORCART', 'Janitor Cart', 'maintenance', [1.0, 0.9, 0.55], 'box', ['janitor', 'servicecorr'], ['plastic', 'fabric'], {}],
  ['MAINT-MOPBUCKET', 'Mop + Bucket', 'maintenance', [0.4, 1.3, 0.48], 'box', ['janitor', 'servicecorr'], ['plastic', 'wood'], {}],
  ['MAINT-BROOM', 'Broom (leaning)', 'maintenance', [0.26, 1.3, 0.3], 'none', ['janitor', 'garage'], ['wood', 'plastic'], {}],
  ['MAINT-CLEANBOTTLE', 'Cleaning Spray Bottle', 'maintenance', [0.08, 0.26, 0.08], 'none', ['janitor'], ['plastic'], { lod: 'instanced' }],
  ['MAINT-WIRESHELF', 'Wire Utility Shelving', 'maintenance', [1.2, 1.8, 0.45], 'box', ['janitor', 'loading', 'garage'], ['chrome'], {}],
  ['MAINT-BOX-S', 'Cardboard Box (small)', 'maintenance', [0.3, 0.24, 0.3], 'box', ['loading', 'copyroom', 'archive'], ['cardboard'], { lod: 'instanced' }],
  ['MAINT-BOX-M', 'Cardboard Box (medium)', 'maintenance', [0.45, 0.35, 0.42], 'box', ['loading', 'copyroom', 'archive'], ['cardboard'], { lod: 'instanced' }],
  ['MAINT-BOX-L', 'Cardboard Box (large)', 'maintenance', [0.6, 0.45, 0.55], 'box', ['loading', 'garage'], ['cardboard'], { lod: 'instanced' }],
  ['MAINT-BOX-OPEN', 'Cardboard Box (open)', 'maintenance', [0.45, 0.45, 0.42], 'box', ['loading', 'copyroom'], ['cardboard', 'paper'], {}],
  ['MAINT-CRATE', 'Shipping Crate', 'maintenance', [0.94, 0.8, 0.74], 'box', ['loading', 'garage'], ['wood'], {}],
  ['MAINT-PALLET', 'Wooden Pallet', 'maintenance', [1.2, 0.15, 1.0], 'box', ['loading', 'garage', 'eastapron'], ['wood'], { lod: 'instanced' }],
  ['MAINT-HANDTRUCK', 'Hand Truck', 'maintenance', [0.5, 1.3, 0.4], 'box', ['loading', 'servicecorr'], ['paintedMetal', 'rubber'], {}],
  ['MAINT-LADDER', 'Step Ladder', 'maintenance', [0.5, 1.5, 0.62], 'box', ['mechanical', 'archive', 'garage'], ['aluminum'], {}],
  ['MAINT-TOOLCASE', 'Tool Case', 'maintenance', [0.46, 0.27, 0.22], 'box', ['mechanical', 'garage'], ['paintedMetal'], {}],
  ['MAINT-CONE', 'Warning Cone', 'maintenance', [0.3, 0.7, 0.3], 'none', ['servicecorr', 'garage', 'courtyard'], ['plastic'], { lod: 'instanced' }],
  ['MAINT-WETFLOOR', 'Wet Floor Sign', 'maintenance', [0.3, 0.63, 0.24], 'none', ['servicecorr', 'restrooms'], ['plastic'], {}],
  ['MAINT-FLOORMAT', 'Walk-off Floor Mat', 'maintenance', [1.8, 0.02, 1.1], 'none', ['entrance', 'vestibule', 'garage'], ['rubber'], {}],
  ['MAINT-BOLLARD', 'Loading Bollard', 'maintenance', [0.16, 0.92, 0.16], 'box', ['courtyard', 'eastapron', 'garage'], ['paintedMetal'], { lod: 'instanced' }],
  ['MAINT-GARAGECTRL', 'Garage Control Box', 'maintenance', [0.2, 0.28, 0.12], 'none', ['garage'], ['paintedMetal'], { anims: ['open-shutter'] }],
  ['MAINT-SUPPLYCRATE', 'Ammunition Supply Crate', 'maintenance', [0.87, 0.52, 0.52], 'box', ['loading'], ['paintedMetal'], { anims: ['interact'] }],
  // ---- clutter ---------------------------------------------------------------
  ['CLUT-PAPER', 'Loose Paper Sheet', 'clutter', [0.21, 0.002, 0.3], 'none', ['many'], ['paper'], { lod: 'instanced' }],
  ['CLUT-PAPERSTACK', 'Paper Stack', 'clutter', [0.22, 0.06, 0.3], 'none', ['many'], ['paper'], { lod: 'instanced' }],
  ['CLUT-FOLDER', 'Manila Folder', 'clutter', [0.24, 0.01, 0.32], 'none', ['many'], ['paper'], { lod: 'instanced' }],
  ['CLUT-BINDER', 'Ring Binder', 'clutter', [0.07, 0.31, 0.28], 'none', ['many'], ['plastic', 'paper'], { lod: 'instanced' }],
  ['CLUT-NOTEBOOK', 'Notebook', 'clutter', [0.15, 0.015, 0.21], 'none', ['many'], ['paper'], { lod: 'instanced' }],
  ['CLUT-PEN', 'Pen', 'clutter', [0.14, 0.01, 0.01], 'none', ['many'], ['plastic'], { lod: 'instanced' }],
  ['CLUT-PENCIL', 'Pencil', 'clutter', [0.15, 0.008, 0.008], 'none', ['many'], ['wood'], { lod: 'instanced' }],
  ['CLUT-STAPLER', 'Stapler', 'clutter', [0.15, 0.06, 0.04], 'none', ['many'], ['plastic'], { lod: 'instanced' }],
  ['CLUT-TAPE', 'Tape Dispenser', 'clutter', [0.14, 0.09, 0.05], 'none', ['many'], ['plastic'], {}],
  ['CLUT-SCISSORS', 'Scissors', 'clutter', [0.16, 0.01, 0.05], 'none', ['many'], ['stainless', 'plastic'], {}],
  ['CLUT-STICKY', 'Sticky-note Block', 'clutter', [0.075, 0.02, 0.075], 'none', ['many'], ['paper'], { lod: 'instanced' }],
  ['CLUT-CLIPSDISH', 'Paper Clips Dish', 'clutter', [0.09, 0.03, 0.09], 'none', ['many'], ['plastic', 'stainless'], {}],
  ['CLUT-BADGE', 'ID Badge on Lanyard', 'clutter', [0.09, 0.01, 0.16], 'none', ['many'], ['plastic', 'fabric'], {}],
  ['CLUT-KEYCARD', 'Access Keycard', 'clutter', [0.086, 0.002, 0.054], 'none', ['itroom'], ['plastic'], { anims: ['pickup'] }],
  ['CLUT-CALENDAR', 'Desk Calendar', 'clutter', [0.14, 0.1, 0.1], 'none', ['many'], ['paper'], {}],
  ['CLUT-PHOTOFRAME', 'Photo Frame', 'clutter', [0.13, 0.11, 0.05], 'none', ['many'], ['wood', 'photo'], { lod: 'instanced' }],
  ['CLUT-BROCHURE', 'Tri-fold Company Brochure', 'clutter', [0.1, 0.07, 0.07], 'none', ['lobby', 'waiting'], ['paper'], { lod: 'instanced' }],
  ['CLUT-BOTTLE', 'Water Bottle', 'clutter', [0.07, 0.22, 0.07], 'none', ['many'], ['glass', 'plastic'], { lod: 'instanced' }],
  ['CLUT-CAN', 'Drinks Can', 'clutter', [0.066, 0.12, 0.066], 'none', ['many'], ['aluminum'], { lod: 'instanced' }],
  ['CLUT-WRAPPER', 'Food Wrapper', 'clutter', [0.1, 0.01, 0.06], 'none', ['breakroom', 'openoffice'], ['plastic'], { lod: 'instanced' }],
  ['CLUT-ORGANISER', 'Desk Organiser', 'clutter', [0.16, 0.14, 0.09], 'none', ['many'], ['plastic'], { lod: 'instanced' }],
  ['CLUT-PLANT-SNAKE', 'Potted Snake Plant', 'clutter', [0.35, 0.75, 0.35], 'none', ['many'], ['ceramic', 'foliage'], { lod: 'instanced' }],
  ['CLUT-PLANT-FICUS', 'Potted Ficus', 'clutter', [0.75, 1.6, 0.75], 'box', ['lobby', 'waiting', 'execcorr'], ['plastic', 'foliage'], { lod: 'instanced' }],
  ['CLUT-PLANT-POT', 'Empty Plant Pot', 'clutter', [0.22, 0.16, 0.22], 'none', ['janitor'], ['ceramic'], {}],
  ['CLUT-BACKPACK', 'Backpack', 'clutter', [0.34, 0.45, 0.25], 'none', ['openoffice'], ['fabric'], {}],
  ['CLUT-BRIEFCASE', 'Briefcase', 'clutter', [0.42, 0.38, 0.12], 'none', ['execoffice', 'waiting'], ['leather', 'aluminum'], {}],
  ['CLUT-UMBRELLA', 'Umbrella (leaning)', 'clutter', [0.1, 0.8, 0.12], 'none', ['entrance', 'openoffice'], ['fabric', 'plastic'], {}],
  // ---- signage -----------------------------------------------------------------
  ['SIGN-LOGO', 'Northstar Logo Panel', 'signage', [2.4, 0.75, 0.03], 'none', ['lobby'], ['brand', 'emissive'], {}],
  ['SIGN-DEPT', 'Department Sign', 'signage', [0.55, 0.17, 0.02], 'none', ['many'], ['sign'], { lod: 'instanced' }],
  ['SIGN-ROOMPLATE', 'Room Number Plate', 'signage', [0.16, 0.08, 0.01], 'none', ['many'], ['sign'], { lod: 'instanced' }],
  ['SIGN-WAYFIND', 'Wayfinding Sign', 'signage', [0.64, 0.4, 0.02], 'none', ['lobby', 'midcorr', 'stairwell'], ['sign'], {}],
  ['SIGN-SAFETY', 'Safety Poster', 'signage', [0.42, 0.56, 0.01], 'none', ['servicecorr', 'loading', 'breakroom'], ['paper'], { lod: 'instanced' }],
  ['SIGN-EVAC-DIAGRAM', 'Evacuation Diagram', 'signage', [0.42, 0.52, 0.01], 'none', ['midcorr', 'lobby', 'servicecorr'], ['paper'], {}],
  ['SIGN-NOTICE-EMP', 'Employee Notice', 'signage', [0.28, 0.36, 0.01], 'none', ['many'], ['paper'], { lod: 'instanced' }],
  ['SIGN-NOTICE-SEC', 'Security Notice', 'signage', [0.28, 0.36, 0.01], 'none', ['vestibule', 'serverroom', 'garage'], ['paper'], { lod: 'instanced' }],
  ['SIGN-FLYER', 'Bulletin Flyer', 'signage', [0.16, 0.2, 0.01], 'none', ['breakroom', 'copyroom'], ['paper'], { lod: 'instanced' }],
  ['SIGN-PICTO-WC', 'Restroom Pictogram', 'signage', [0.15, 0.15, 0.01], 'none', ['restrooms', 'midcorr'], ['sign'], {}],
  ['SIGN-PICTO-EXIT', 'Exit Runner Pictogram', 'signage', [0.15, 0.15, 0.01], 'none', ['many'], ['sign'], {}],
  ['SIGN-SHIPLABEL', 'Shipping Label Placard', 'signage', [0.3, 0.2, 0.01], 'none', ['loading'], ['paper'], {}],
  ['SIGN-EQUIP-LABEL', 'Equipment Hazard Label', 'signage', [0.24, 0.08, 0.01], 'none', ['mechanical', 'serverroom', 'garage'], ['sign'], { lod: 'instanced' }],
  ['SIGN-EMERG-PLACARD', 'Emergency Instructions Placard', 'signage', [0.26, 0.36, 0.01], 'none', ['midcorr', 'weststair', 'loading'], ['paper'], {}],
  // ---- populator one-offs (storytelling) ----------------------------------
  ['PROP-COLUMN', 'Structural Column Casing', 'architecture', [0.42, 3.0, 0.42], 'box', ['openoffice'], ['paintedMetal'], {}],
  ['CLUT-TENTCARD', 'Counter Tent Card ("Back in 5")', 'clutter', [0.15, 0.11, 0.06], 'none', ['lobby'], ['paper'], {}],
  ['CLUT-DRAWING', "Child's Drawing (pinned)", 'clutter', [0.19, 0.15, 0.01], 'none', ['openoffice'], ['paper'], {}],
  ['CLUT-COAT-HOOK', 'Coat Left on Wall Hook', 'clutter', [0.4, 0.95, 0.2], 'none', ['vestibule', 'execoffice', 'breakroom'], ['fabric', 'aluminum'], {}],
  ['SIGN-NOTICE-TAPED', 'Taped Paper Notice', 'signage', [0.19, 0.26, 0.01], 'none', ['many'], ['paper'], {}],
];

// Environmental decals owned by fable3 (src/fx/decals.js).
const DECALS = [
  ['DECAL-BULLET-SET', 'Bullet Impact Decal Set (7 surfaces, 4 variants)', [0.12, 0.12, 0]],
  ['DECAL-BLOOD', 'Blood Decal Set (reduced-blood aware)', [0.5, 0.5, 0]],
  ['DECAL-SCORCH', 'Scorch Decal Set', [0.6, 0.6, 0]],
  ['DECAL-WEAR-SET', 'Environmental Wear Decal Set (carpet paths, scuffs, stains, footprints, residue)', [1.5, 1.5, 0]],
];

export function registerPropAssets() {
  for (const [id, name, category, dims, collision, rooms, materials, extra] of CATALOG) {
    assets.register({
      id,
      name,
      category,
      owner: 'fable3',
      files: FILES,
      rooms,
      dims,
      pivot: 'base-centre, -Z forward (wall-mounted props pivot at the wall face)',
      materials,
      textures: ['baseColor', 'normal', 'roughness', 'ao'].concat(
        materials.some((m) => String(m).includes('emissive') || String(m).includes('screen')) ? ['emissive'] : []
      ),
      collision,
      lod: extra?.lod === 'instanced'
        ? 'InstancedMesh shared geometry; dropped by propDensity when small'
        : 'single shared-geometry mesh group',
      anims: extra?.anims || [],
      audio: [],
      status: 'integrated',
      acceptance:
        'Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting.',
      evidence: 'tests/props.spec.js + QA gallery screenshot',
      discrepancies: 'none',
    });
  }
  for (const [id, name, dims] of DECALS) {
    assets.register({
      id,
      name,
      category: 'decal',
      owner: 'fable3',
      files: ['src/fx/decals.js'],
      rooms: ['all'],
      dims,
      pivot: 'quad centre, +Z along surface normal',
      materials: ['alpha-blended decal'],
      textures: ['baseColor+alpha'],
      collision: 'none',
      lod: 'pooled quads, budget from settings.quality.decalBudget',
      status: 'integrated',
      acceptance: 'No z-fighting (0.006m offset + polygonOffset); variants prevent visible repetition; reducedBlood respected.',
      evidence: 'tests/decals.spec.js',
      discrepancies: 'none',
    });
  }
  return CATALOG.length + DECALS.length;
}

export const PROP_CATALOG = CATALOG;
