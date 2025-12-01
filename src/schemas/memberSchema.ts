import { z } from 'zod';

// Phone number validation for Indian numbers (10 digits)
const phoneRegex = /^[6-9]\d{9}$/;

// Pincode validation for Indian pincodes (6 digits)
const pincodeRegex = /^\d{6}$/;

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const memberSchema = z.object({
  // Personal Information
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),

  email: z
    .string()
    .email('Invalid email address')
    .or(z.literal('')),

  phone: z
    .string()
    .regex(phoneRegex, 'Phone number must be a valid 10-digit Indian number starting with 6-9')
    .min(10, 'Phone number must be 10 digits')
    .max(10, 'Phone number must be 10 digits'),

  date_of_birth: z.string().optional().nullable(),

  gender: z.enum(['male', 'female', 'other']).default('male'),

  blood_group: z.string().optional().nullable(),

  preferred_language: z.enum(['en', 'te', 'ta', 'hi']).default('en'),

  status: z.enum(['active', 'inactive', 'frozen', 'cancelled']).default('active').optional(),

  // Address Information
  address: z.string().max(500, 'Address must not exceed 500 characters').optional().nullable(),

  city: z.string().max(100, 'City name must not exceed 100 characters').optional().nullable(),

  state: z.string().max(100, 'State name must not exceed 100 characters').optional().nullable(),

  pincode: z
    .string()
    .regex(pincodeRegex, 'Pincode must be a 6-digit number')
    .optional()
    .or(z.literal(''))
    .nullable(),

  // Emergency Contact
  emergency_contact_name: z
    .string()
    .max(100, 'Name must not exceed 100 characters')
    .optional()
    .nullable(),

  emergency_contact_phone: z
    .string()
    .regex(phoneRegex, 'Emergency phone must be a valid 10-digit number')
    .optional()
    .or(z.literal(''))
    .nullable(),

  // Medical Information
  medical_conditions: z
    .string()
    .max(1000, 'Medical conditions must not exceed 1000 characters')
    .optional()
    .nullable(),

  // Tags
  tags: z.array(z.string()).optional().default([]),

  // Subscription data (only for new members)
  subscriptionData: z
    .object({
      planId: z.string().uuid('Invalid plan ID'),
      amount: z.number().positive('Amount must be positive'),
      startDate: z.string(),
    })
    .optional()
    .nullable(),
});

export type MemberFormData = z.infer<typeof memberSchema>;

// Schema for editing existing members (without subscription data)
export const editMemberSchema = memberSchema.omit({ subscriptionData: true });

export type EditMemberFormData = z.infer<typeof editMemberSchema>;
