import { z } from 'zod';

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

function isValidDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

export function calculateAge(dateOfBirth: string, today = new Date()): number {
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const phoneSchema = z.string({ error: 'Phone number is required.' })
  .trim()
  .min(1, 'Phone number is required.')
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'))
  .transform((value) => `+91${value.replace(/^\+91/, '')}`);

export const citizenRegistrationSchema = z.object({
  name: z.string({ error: 'Full name is required.' })
    .trim()
    .min(1, 'Full name is required.')
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .pipe(z.string()
      .min(2, 'Full name must contain at least 2 characters.')
      .max(100, 'Full name cannot exceed 100 characters.')
      .refine((value) => !/\d/.test(value), 'Full name cannot contain numbers.')
      .regex(/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u, 'Full name cannot contain numbers or unsupported characters.')),
  gender: z.enum(['female', 'male', 'non_binary', 'prefer_not_to_say', 'other'], {
    error: 'Please select your gender.',
  }),
  genderOther: z.string().trim().max(60, 'Please keep this field under 60 characters.').optional(),
  dateOfBirth: z.string({ error: 'Date of birth is required.' })
    .min(1, 'Date of birth is required.')
    .refine(isValidDate, 'Please enter a valid date of birth.')
    .refine((value) => isValidDate(value) && new Date(`${value}T00:00:00.000Z`) <= new Date(), 'Date of birth cannot be in the future.')
    .refine((value) => isValidDate(value) && calculateAge(value) >= 13, 'You must be at least 13 years old to register.'),
  phone: phoneSchema,
  email: z.string({ error: 'Email is required.' })
    .trim()
    .min(1, 'Email is required.')
    .toLowerCase()
    .max(254, 'Email address cannot exceed 254 characters.')
    .pipe(z.email('Enter a valid email address.')),
  password: z.string({ error: 'Password is required.' })
    .min(8, 'Password must contain at least 8 characters.')
    .max(64, 'Password cannot exceed 64 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/\d/, 'Password must contain at least one number.')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.'),
  confirmPassword: z.string({ error: 'Please confirm your password.' }).min(1, 'Please confirm your password.'),
  address: z.string({ error: 'Address is required.' }).trim()
    .min(1, 'Address is required.')
    .min(5, 'Address must contain at least 5 characters.')
    .max(250, 'Address cannot exceed 250 characters.'),
  city: z.string({ error: 'City is required.' })
    .trim()
    .min(1, 'City is required.')
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(2, 'City must contain at least 2 characters.')
      .max(100, 'City cannot exceed 100 characters.')
      .regex(/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u, 'Enter a valid city name.')),
  state: z.enum(INDIAN_STATES, { error: 'Please select a state or union territory.' }),
  pincode: z.string({ error: 'Pincode is required.' }).trim()
    .min(1, 'Pincode is required.')
    .regex(/^\d{6}$/, 'Pincode must contain exactly 6 digits.'),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
  }
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')),
  password: z.string().min(1, 'Password is required.').max(64, 'Invalid credentials.'),
});

export type CitizenRegistrationInput = z.input<typeof citizenRegistrationSchema>;
export type CitizenRegistration = z.output<typeof citizenRegistrationSchema>;