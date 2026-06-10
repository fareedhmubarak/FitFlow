import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'images';
const prefix = process.env.SUPABASE_STORAGE_PREFIX || '';
const pageSize = Number(process.env.SUPABASE_STORAGE_PAGE_SIZE || 100);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function isImagePath(path) {
  return /\.(jpe?g|png|webp|heic)$/i.test(path);
}

function isThumbnailPath(path) {
  return path.split('/').includes('thumbs');
}

function getThumbnailPath(path) {
  const slashIndex = path.lastIndexOf('/');
  if (slashIndex === -1) return `thumbs/${path}`;
  return `${path.slice(0, slashIndex)}/thumbs/${path.slice(slashIndex + 1).replace(/\.[^.]+$/, '.webp')}`;
}

async function listObjects(folder, results = []) {
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      const path = folder ? `${folder}/${item.name}` : item.name;
      if (item.id === null) {
        await listObjects(path, results);
      } else if (isImagePath(path) && !isThumbnailPath(path)) {
        results.push(path);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return results;
}

async function exists(path) {
  const folder = path.slice(0, path.lastIndexOf('/'));
  const name = path.slice(path.lastIndexOf('/') + 1);
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1,
    search: name,
  });

  if (error) throw error;
  return data?.some((item) => item.name === name);
}

async function createThumbnail(path) {
  const thumbnailPath = getThumbnailPath(path);
  if (await exists(thumbnailPath)) {
    return { path, thumbnailPath, skipped: true };
  }

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;

  const input = Buffer.from(await data.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize(160, 160, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(thumbnailPath, output, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: true,
  });

  if (uploadError) throw uploadError;
  return { path, thumbnailPath, bytes: output.length };
}

const objects = await listObjects(prefix);
console.log(`Found ${objects.length} source images in ${bucket}/${prefix || ''}`);

let created = 0;
let skipped = 0;
let failed = 0;

for (const objectPath of objects) {
  try {
    const result = await createThumbnail(objectPath);
    if (result.skipped) {
      skipped += 1;
      console.log(`skip ${result.thumbnailPath}`);
    } else {
      created += 1;
      console.log(`created ${result.thumbnailPath} (${Math.round(result.bytes / 1024)} KB)`);
    }
  } catch (error) {
    failed += 1;
    console.error(`failed ${objectPath}:`, error.message);
  }
}

console.log(`Done. created=${created} skipped=${skipped} failed=${failed}`);
