import { supabase, getCurrentGymId } from './supabase';
import { uploadImage } from './imageUpload';

export interface MemberProgress {
  id: string;
  gym_id: string;
  member_id: string;
  record_date: string;
  
  // Photos
  photo_front?: string | null;
  photo_back?: string | null;
  photo_left?: string | null;
  photo_right?: string | null;
  
  // Body measurements
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  body_fat_percentage?: number | null;
  
  // Body part measurements (cm)
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  biceps_left?: number | null;
  biceps_right?: number | null;
  thighs_left?: number | null;
  thighs_right?: number | null;
  calves_left?: number | null;
  calves_right?: number | null;
  
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProgressInput {
  member_id: string;
  record_date: string;
  
  photo_front?: string | null;
  photo_back?: string | null;
  photo_left?: string | null;
  photo_right?: string | null;
  
  weight?: number | null;
  height?: number | null;
  body_fat_percentage?: number | null;
  
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  biceps_left?: number | null;
  biceps_right?: number | null;
  thighs_left?: number | null;
  thighs_right?: number | null;
  calves_left?: number | null;
  calves_right?: number | null;
  
  notes?: string | null;
}

export interface ProgressComparison {
  before: MemberProgress;
  after: MemberProgress;
  changes: {
    weight?: { before: number; after: number; diff: number; percentChange: number };
    bmi?: { before: number; after: number; diff: number };
    body_fat_percentage?: { before: number; after: number; diff: number };
    chest?: { before: number; after: number; diff: number };
    waist?: { before: number; after: number; diff: number };
    hips?: { before: number; after: number; diff: number };
    biceps_left?: { before: number; after: number; diff: number };
    biceps_right?: { before: number; after: number; diff: number };
    thighs_left?: { before: number; after: number; diff: number };
    thighs_right?: { before: number; after: number; diff: number };
  };
  daysBetween: number;
}

class ProgressService {
  private static instance: ProgressService;

  static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  /**
   * Get all progress records for a member
   */
  async getMemberProgress(memberId: string): Promise<MemberProgress[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_member_progress')
        .select('*')
        .eq('gym_id', gymId)
        .eq('member_id', memberId)
        .order('record_date', { ascending: false });

      if (error) throw error;
      return data as MemberProgress[];
    } catch (error) {
      console.error('Error fetching member progress:', error);
      throw error;
    }
  }

  /**
   * Get a single progress record
   */
  async getProgressById(progressId: string): Promise<MemberProgress | null> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_member_progress')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', progressId)
        .single();

      if (error) throw error;
      return data as MemberProgress;
    } catch (error) {
      console.error('Error fetching progress record:', error);
      return null;
    }
  }

  /**
   * Get the latest progress record for a member
   */
  async getLatestProgress(memberId: string): Promise<MemberProgress | null> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_member_progress')
        .select('*')
        .eq('gym_id', gymId)
        .eq('member_id', memberId)
        .order('record_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return data as MemberProgress | null;
    } catch (error) {
      console.error('Error fetching latest progress:', error);
      return null;
    }
  }

  /**
   * Create a new progress record
   */
  async createProgress(input: CreateProgressInput): Promise<MemberProgress> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_member_progress')
        .insert({
          gym_id: gymId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MemberProgress;
    } catch (error) {
      console.error('Error creating progress record:', error);
      throw error;
    }
  }

  /**
   * Update a progress record
   */
  async updateProgress(progressId: string, input: Partial<CreateProgressInput>): Promise<MemberProgress> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_member_progress')
        .update(input)
        .eq('id', progressId)
        .eq('gym_id', gymId)
        .select()
        .single();

      if (error) throw error;
      return data as MemberProgress;
    } catch (error) {
      console.error('Error updating progress record:', error);
      throw error;
    }
  }

  /**
   * Delete a progress record
   */
  async deleteProgress(progressId: string): Promise<void> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { error } = await supabase
        .from('gym_member_progress')
        .delete()
        .eq('id', progressId)
        .eq('gym_id', gymId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting progress record:', error);
      throw error;
    }
  }

  /**
   * Upload progress photo
   */
  async uploadProgressPhoto(file: File, memberId: string, photoType: 'front' | 'back' | 'left' | 'right'): Promise<string> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Try uploading to 'images' bucket first, fall back to 'member-photos' if not exists
      try {
        const result = await uploadImage(file, 'images', `progress/${gymId}/${memberId}`);
        return result.url;
      } catch (bucketError: any) {
        // If bucket not found, try member-photos bucket
        if (bucketError.message?.includes('Bucket not found') || bucketError.message?.includes('bucket')) {
          console.warn('images bucket not found, trying member-photos');
          const result = await uploadImage(file, 'member-photos', `progress/${gymId}/${memberId}`);
          return result.url;
        }
        throw bucketError;
      }
    } catch (error) {
      console.error('Error uploading progress photo:', error);
      throw error;
    }
  }

  /**
   * Compare two progress records
   */
  compareProgress(before: MemberProgress, after: MemberProgress): ProgressComparison {
    const calculateDiff = (beforeVal?: number | null, afterVal?: number | null) => {
      if (beforeVal == null || afterVal == null) return undefined;
      return {
        before: beforeVal,
        after: afterVal,
        diff: Number((afterVal - beforeVal).toFixed(2)),
        percentChange: Number((((afterVal - beforeVal) / beforeVal) * 100).toFixed(1))
      };
    };

    const daysBetween = Math.ceil(
      (new Date(after.record_date).getTime() - new Date(before.record_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      before,
      after,
      changes: {
        weight: calculateDiff(before.weight, after.weight),
        bmi: calculateDiff(before.bmi, after.bmi),
        body_fat_percentage: calculateDiff(before.body_fat_percentage, after.body_fat_percentage),
        chest: calculateDiff(before.chest, after.chest),
        waist: calculateDiff(before.waist, after.waist),
        hips: calculateDiff(before.hips, after.hips),
        biceps_left: calculateDiff(before.biceps_left, after.biceps_left),
        biceps_right: calculateDiff(before.biceps_right, after.biceps_right),
        thighs_left: calculateDiff(before.thighs_left, after.thighs_left),
        thighs_right: calculateDiff(before.thighs_right, after.thighs_right),
      },
      daysBetween,
    };
  }

  /**
   * Calculate BMI
   */
  calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    return Number((weightKg / (heightM * heightM)).toFixed(2));
  }

  /**
   * Get BMI category
   */
  getBMICategory(bmi: number): { category: string; color: string } {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { category: 'Normal', color: 'text-emerald-500' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-amber-500' };
    return { category: 'Obese', color: 'text-red-500' };
  }
}

export const progressService = ProgressService.getInstance();
