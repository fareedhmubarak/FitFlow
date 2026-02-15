import { supabase, getCurrentGymId } from './supabase';
import { uploadImage } from './imageUpload';
import { auditLogger } from './auditLogger';

export interface MemberProgress {
  id: string;
  gym_id: string;
  member_id: string;
  record_date: string;
  
  // Photos - matching database column names
  photo_front_url?: string | null;
  photo_back_url?: string | null;
  photo_left_url?: string | null;
  photo_right_url?: string | null;
  
  // Body measurements
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  body_fat_percentage?: number | null;
  
  // Body part measurements (cm) - matching database column names
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  biceps?: number | null;
  thighs?: number | null;
  calves?: number | null;
  
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProgressInput {
  member_id: string;
  record_date: string;
  
  // Photos - matching database column names
  photo_front_url?: string | null;
  photo_back_url?: string | null;
  photo_left_url?: string | null;
  photo_right_url?: string | null;
  
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  body_fat_percentage?: number | null;
  
  // Body part measurements - matching database column names
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  biceps?: number | null;
  thighs?: number | null;
  calves?: number | null;
  
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
    biceps?: { before: number; after: number; diff: number };
    thighs?: { before: number; after: number; diff: number };
    calves?: { before: number; after: number; diff: number };
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
      if (!gymId) {
        console.warn('No gym ID found for progress fetch');
        return []; // Return empty instead of throwing
      }

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
   * Validate progress input data
   */
  private validateInput(input: CreateProgressInput): void {
    // Prevent future dates
    const recordDate = new Date(input.record_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (recordDate > today) {
      throw new Error('Record date cannot be in the future');
    }

    // Validate numeric fields - no negatives, reasonable ranges
    const numericChecks: { field: keyof CreateProgressInput; label: string; min: number; max: number }[] = [
      { field: 'weight', label: 'Weight', min: 1, max: 500 },
      { field: 'height', label: 'Height', min: 30, max: 300 },
      { field: 'body_fat_percentage', label: 'Body fat percentage', min: 1, max: 70 },
      { field: 'chest', label: 'Chest', min: 10, max: 250 },
      { field: 'waist', label: 'Waist', min: 10, max: 250 },
      { field: 'hips', label: 'Hips', min: 10, max: 250 },
      { field: 'biceps', label: 'Biceps', min: 5, max: 100 },
      { field: 'thighs', label: 'Thighs', min: 10, max: 150 },
      { field: 'calves', label: 'Calves', min: 5, max: 100 },
    ];

    for (const check of numericChecks) {
      const value = input[check.field] as number | null | undefined;
      if (value != null) {
        if (value < check.min || value > check.max) {
          throw new Error(`${check.label} must be between ${check.min} and ${check.max}`);
        }
      }
    }
  }

  /**
   * Create a new progress record
   */
  async createProgress(input: CreateProgressInput): Promise<MemberProgress> {
    try {
      this.validateInput(input);

      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Auto-calculate BMI if weight and height provided but BMI is not
      const dataToInsert: Record<string, unknown> = {
        gym_id: gymId,
        ...input,
      };
      if (!input.bmi && input.weight && input.height && input.weight > 0 && input.height > 0) {
        dataToInsert.bmi = this.calculateBMI(input.weight, input.height);
      }

      const { data, error } = await supabase
        .from('gym_member_progress')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      auditLogger.logMemberProgressRecorded(input.member_id, '', {
        progress_id: (data as MemberProgress).id,
        record_date: input.record_date,
        weight: input.weight,
        type: 'progress_created',
      });

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

      auditLogger.logMemberProgressRecorded((data as MemberProgress).member_id, '', {
        progress_id: progressId,
        type: 'progress_updated',
        ...input,
      });

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

      auditLogger.log({
        category: 'MEMBER',
        action: 'member_progress_deleted',
        resourceType: 'progress',
        resourceId: progressId,
        success: true,
        metadata: { type: 'progress_deleted' },
      });
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
        biceps: calculateDiff(before.biceps, after.biceps),
        thighs: calculateDiff(before.thighs, after.thighs),
        calves: calculateDiff(before.calves, after.calves),
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

  /**
   * Get count of progress entries for a member in a specific month
   * Used to enforce the 4 entries per month limit
   */
  async getMonthlyProgressCount(memberId: string, year: number, month: number): Promise<number> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Create date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { count, error } = await supabase
        .from('gym_member_progress')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('member_id', memberId)
        .gte('record_date', startDateStr)
        .lte('record_date', endDateStr);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting monthly progress count:', error);
      throw error;
    }
  }

  /**
   * Check if member can add more progress this month (max 4 per month)
   */
  async canAddProgressThisMonth(memberId: string): Promise<{ canAdd: boolean; currentCount: number; remaining: number }> {
    const now = new Date();
    const count = await this.getMonthlyProgressCount(memberId, now.getFullYear(), now.getMonth() + 1);
    const MAX_MONTHLY_PROGRESS = 4;
    
    return {
      canAdd: count < MAX_MONTHLY_PROGRESS,
      currentCount: count,
      remaining: Math.max(0, MAX_MONTHLY_PROGRESS - count)
    };
  }
}

export const progressService = ProgressService.getInstance();
