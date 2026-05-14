import { supabase } from "./supabaseClient.js";

const PRIVATE_STORE_KEY = "luke_space_private_tracks_v1";

const PUBLIC_FIELDS = [
  "building_id",
  "building_name",
  "layout",
  "area_num",
  "public_price_num",
  "tags"
];

const PRIVATE_FIELDS = [
  "unit_no_plain",
  "owner_mindset",
  "key_location",
  "showing_risks",
  "private_notes"
];

export function splitListingPayload(payload) {
  const pub = {};
  const pri = {};

  for (const key of PUBLIC_FIELDS) {
    if (payload[key] !== undefined) pub[key] = payload[key];
  }
  for (const key of PRIVATE_FIELDS) {
    if (payload[key] !== undefined) pri[key] = payload[key];
  }

  return { publicData: pub, privateData: pri };
}

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildUnitHash(buildingId, unitNoPlain) {
  return sha256Hex(`${buildingId}::${String(unitNoPlain).trim()}`);
}

export async function savePublicListing(payload, userId) {
  const buildingId = payload.building_id;
  const unitNoPlain = payload.unit_no_plain;
  if (!buildingId || !unitNoPlain) {
    throw new Error("building_id and unit_no_plain are required");
  }

  const unit_no_hash = await buildUnitHash(buildingId, unitNoPlain);

  const row = {
    building_id: buildingId,
    building_name: payload.building_name || "",
    unit_no_hash,
    layout: payload.layout || null,
    area_num: payload.area_num || null,
    public_price_num: payload.public_price_num || null,
    tags: payload.tags || [],
    created_by: userId || null
  };

  const { data, error } = await supabase
    .from("listings_public")
    .insert(row)
    .select("id, building_id, unit_no_hash")
    .single();

  if (error) throw error;
  return data;
}

export function getPrivateLocalRecords() {
  try {
    return JSON.parse(localStorage.getItem(PRIVATE_STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePrivateNoteLocal(record) {
  const current = getPrivateLocalRecords();
  const item = {
    local_id: record.local_id || String(Date.now()),
    public_listing_id: record.public_listing_id || null,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    unit_no_plain: record.unit_no_plain || "",
    owner_mindset: record.owner_mindset || "",
    key_location: record.key_location || "",
    showing_risks: record.showing_risks || "",
    private_notes: record.private_notes || ""
  };

  const idx = current.findIndex((x) => x.local_id === item.local_id);
  if (idx >= 0) current[idx] = item;
  else current.unshift(item);

  localStorage.setItem(PRIVATE_STORE_KEY, JSON.stringify(current));
  return item;
}

export async function createVisualPack(listingId, agentId, pack) {
  const row = {
    listing_id: listingId,
    agent_id: agentId,
    template: pack.template || "luke_space_v1",
    title: pack.title || "",
    cover_image: pack.cover_image || "",
    assets: pack.assets || [],
    summary: pack.summary || "",
    watermark_enabled: pack.watermark_enabled ?? true
  };

  const { data, error } = await supabase
    .from("visual_packs")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;

  const shareSlug = `pack-${data.id.slice(0, 8)}`;
  return { id: data.id, share_slug: shareSlug };
}

export async function trackShareEvent(event) {
  const row = {
    visual_pack_id: event.visual_pack_id,
    viewer_id: event.viewer_id || null,
    source: event.source || "link",
    duration_sec: event.duration_sec || 0,
    event_type: event.event_type,
    meta: event.meta || {}
  };

  const { error } = await supabase.from("share_events").insert(row);
  if (error) throw error;
  return true;
}

export async function getClusteredListings(filters = {}) {
  let query = supabase
    .from("listings_public")
    .select("id, building_id, building_name, unit_no_hash, layout, area_num, public_price_num, tags, created_at");

  if (filters.building_id) query = query.eq("building_id", filters.building_id);
  if (filters.area_min) query = query.gte("area_num", filters.area_min);
  if (filters.area_max) query = query.lte("area_num", filters.area_max);
  if (filters.price_min) query = query.gte("public_price_num", filters.price_min);
  if (filters.price_max) query = query.lte("public_price_num", filters.price_max);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  const groups = new Map();
  for (const row of data || []) {
    const key = `${row.building_id}::${row.unit_no_hash}`;
    if (!groups.has(key)) {
      groups.set(key, {
        cluster_key: key,
        building_id: row.building_id,
        building_name: row.building_name,
        unit_no_hash: row.unit_no_hash,
        area_num: row.area_num,
        public_price_num: row.public_price_num,
        listing_ids: [],
        pack_count: 0,
        updated_at: row.created_at
      });
    }
    groups.get(key).listing_ids.push(row.id);
  }

  return [...groups.values()];
}

export async function saveListingDualTrack(payload, userId) {
  const { publicData, privateData } = splitListingPayload(payload);

  const pubRes = await savePublicListing({ ...publicData, unit_no_plain: privateData.unit_no_plain }, userId);
  const privateRes = savePrivateNoteLocal({
    ...privateData,
    public_listing_id: pubRes.id
  });

  return { public: pubRes, private: privateRes };
}
