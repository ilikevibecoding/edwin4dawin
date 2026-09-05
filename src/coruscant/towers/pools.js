// Room pools: which library templates a floor draws from, by family and floor band (ground floors around the
// lobby, typical floors, the top floors, and the inner rooms of deep strips).
const SERVICE = ['storage', 'restroom', 'server_room', 'laundry', 'kitchen', 'archive', 'comms_room'];

export const POOLS = {
  slab: {
    ground: ['shop', 'cantina', 'restaurant', 'security_post', 'bank_vault', 'lounge', 'medbay', 'arcade'],
    typical: ['open_plan_office', 'open_plan_office', 'meeting_room', 'executive_office', 'server_room', 'restroom', 'storage', 'lounge', 'cafeteria', 'comms_room', 'archive', 'library', 'control_room'],
    top: ['executive_office', 'penthouse', 'observation_deck', 'meeting_room', 'garden_terrace', 'lounge', 'restaurant'],
    back: SERVICE,
  },
  civic: {
    ground: ['security_post', 'lounge', 'gallery', 'museum_hall', 'archive', 'shop', 'medbay'],
    typical: ['council_chamber', 'courtroom', 'executive_office', 'meeting_room', 'archive', 'library', 'security_post', 'lounge', 'open_plan_office', 'meditation_chamber', 'gallery', 'detention_cell', 'restroom'],
    top: ['council_chamber', 'observation_deck', 'garden_terrace', 'meditation_chamber', 'executive_office', 'lounge'],
    back: SERVICE,
  },
  setback: {
    ground: ['shop', 'cantina', 'restaurant', 'medbay', 'security_post', 'laundry', 'arcade', 'market_stalls'],
    typical: ['studio', 'studio', 'family_apartment', 'family_apartment', 'hotel_room', 'laundry', 'restroom', 'kitchen', 'storage', 'gym', 'lounge', 'school_room'],
    top: ['penthouse', 'penthouse', 'garden_terrace', 'observation_deck', 'greenhouse', 'gym'],
    back: ['storage', 'restroom', 'laundry', 'kitchen', 'studio', 'hotel_room'],
  },
  habitat: {
    ground: ['shop', 'cantina', 'medbay', 'security_post', 'restaurant', 'school_room', 'clinic_ward'],
    typical: ['studio', 'family_apartment', 'family_apartment', 'hotel_room', 'barracks', 'kitchen', 'laundry', 'restroom', 'gym', 'lounge', 'greenhouse', 'school_room', 'library'],
    top: ['garden_terrace', 'greenhouse', 'observation_deck', 'penthouse', 'meditation_chamber'],
    back: ['storage', 'restroom', 'laundry', 'kitchen', 'studio'],
  },
  stack: {
    ground: ['garage', 'workshop', 'security_post', 'storage', 'cafeteria', 'droid_bay'],
    typical: ['workshop', 'workshop', 'storage', 'droid_bay', 'reactor_room', 'control_room', 'server_room', 'garage', 'barracks', 'cafeteria', 'armory', 'comms_room', 'restroom'],
    top: ['control_room', 'comms_room', 'reactor_room', 'barracks', 'cafeteria'],
    back: ['storage', 'storage', 'server_room', 'restroom', 'reactor_room'],
  },
  twin: {
    ground: ['shop', 'cantina', 'restaurant', 'security_post', 'bank_vault', 'lounge', 'gallery'],
    typical: ['open_plan_office', 'open_plan_office', 'meeting_room', 'executive_office', 'server_room', 'restroom', 'lounge', 'cafeteria', 'library', 'archive', 'hotel_room', 'gym'],
    top: ['executive_office', 'penthouse', 'observation_deck', 'meeting_room', 'restaurant'],
    back: SERVICE,
  },
  pad: {
    ground: ['hangar', 'garage', 'security_post', 'cantina', 'shop', 'storage'],
    typical: ['hotel_room', 'cantina', 'night_club', 'arcade', 'holo_theatre', 'restaurant', 'dressing_room', 'gallery', 'gym', 'lounge', 'restroom', 'kitchen', 'security_post'],
    top: ['observation_deck', 'night_club', 'penthouse', 'restaurant', 'lounge'],
    back: ['storage', 'restroom', 'kitchen', 'dressing_room', 'server_room'],
    pad: ['hangar', 'garage'],
  },
  hall: {
    ground: ['market_stalls', 'shop', 'restaurant', 'cafeteria', 'security_post', 'medbay'],
    typical: ['shop', 'shop', 'market_stalls', 'storage', 'restaurant', 'cafeteria', 'workshop', 'kitchen', 'medbay', 'arcade', 'laundry', 'gallery'],
    top: ['restaurant', 'garden_terrace', 'market_stalls', 'lounge', 'holo_theatre'],
    back: ['storage', 'storage', 'kitchen', 'restroom'],
  },
  spaceport: {
    ground: ['hangar', 'garage', 'security_post', 'shop', 'cantina', 'storage', 'lounge'],
    typical: ['hangar', 'garage', 'lounge', 'security_post', 'shop', 'cafeteria', 'storage', 'control_room', 'droid_bay', 'restroom', 'medbay'],
    top: ['control_room', 'comms_room', 'observation_deck', 'lounge'],
    back: ['storage', 'restroom', 'server_room'],
  },
};
// entertainment district flavour for shared families
export const DISTRICT_TYPICAL = {
  entertainment: ['cantina', 'night_club', 'arcade', 'holo_theatre', 'restaurant', 'hotel_room', 'hotel_room', 'dressing_room', 'gallery', 'gym', 'lounge', 'restroom', 'kitchen'],
  market: ['shop', 'shop', 'market_stalls', 'storage', 'restaurant', 'cafeteria', 'workshop', 'kitchen', 'medbay', 'arcade', 'laundry', 'hotel_room'],
  senate: ['council_chamber', 'courtroom', 'executive_office', 'meeting_room', 'archive', 'library', 'security_post', 'lounge', 'open_plan_office', 'meditation_chamber', 'gallery', 'restroom'],
};

export function poolsFor(family, district) {
  const base = POOLS[family] || POOLS.slab;
  if (DISTRICT_TYPICAL[district] && (family === 'slab' || family === 'setback' || family === 'twin' || family === 'habitat')) return { ...base, typical: DISTRICT_TYPICAL[district] };
  return base;
}
