import { supabase, getCurrentGymId } from './supabase';

type Gender = 'male' | 'female' | 'other';

/**
 * Generate a realistic person photo URL based on gender
 * Uses randomuser.me API for real human photos
 */
export function getRandomPersonPhoto(gender?: Gender | null): string {
  // Use randomuser.me API for realistic person photos
  // These are real photos of people who have consented to their use
  const genderParam = gender === 'male' ? 'male' : gender === 'female' ? 'female' : '';
  
  if (genderParam) {
    return `https://randomuser.me/api/portraits/${genderParam === 'male' ? 'men' : 'women'}/${Math.floor(Math.random() * 100)}.jpg`;
  }
  
  // For 'other' or undefined, randomly pick
  const isMale = Math.random() > 0.5;
  return `https://randomuser.me/api/portraits/${isMale ? 'men' : 'women'}/${Math.floor(Math.random() * 100)}.jpg`;
}

/**
 * Get a consistent photo for a member based on their ID and gender
 * This ensures the same member always gets the same photo
 */
export function getConsistentPersonPhoto(memberId: string, gender?: Gender | null): string {
  // Create a consistent number from the member ID
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    const char = memberId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const photoIndex = Math.abs(hash % 100);
  
  if (gender === 'male') {
    return `https://randomuser.me/api/portraits/men/${photoIndex}.jpg`;
  } else if (gender === 'female') {
    return `https://randomuser.me/api/portraits/women/${photoIndex}.jpg`;
  } else {
    // For 'other' or undefined, use hash to determine
    const folder = hash % 2 === 0 ? 'men' : 'women';
    return `https://randomuser.me/api/portraits/${folder}/${photoIndex}.jpg`;
  }
}

/**
 * Update all existing members with realistic photos based on their gender
 */
export async function updateAllMembersWithPhotos(): Promise<{ updated: number; errors: number }> {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  // Get all members without photos
  const { data: members, error: fetchError } = await supabase
    .from('gym_members')
    .select('id, gender, photo_url')
    .eq('gym_id', gymId);

  if (fetchError) throw fetchError;
  if (!members || members.length === 0) return { updated: 0, errors: 0 };

  let updated = 0;
  let errors = 0;

  // Update each member with a consistent photo
  for (const member of members) {
    const photoUrl = getConsistentPersonPhoto(member.id, member.gender);
    
    const { error: updateError } = await supabase
      .from('gym_members')
      .update({ photo_url: photoUrl })
      .eq('id', member.id);

    if (updateError) {
      console.error(`Failed to update photo for member ${member.id}:`, updateError);
      errors++;
    } else {
      updated++;
    }
  }

  return { updated, errors };
}

/**
 * Generate photo URL for a new member based on gender
 */
export function generateMemberPhotoUrl(gender?: Gender | null): string {
  return getRandomPersonPhoto(gender);
}
