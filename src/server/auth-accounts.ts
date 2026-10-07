import { randomUUID } from 'node:crypto';
import { hashSync } from 'bcryptjs';
import type { UserRole } from '@/lib/types';
import { getDatabasePool, withDatabaseTransaction } from '@/server/db';
import type { CitizenRegistration } from '@/server/validation/auth';

const DEMO_ACCOUNTS = [
  { email: 'citizen@demo.com', name: 'Priya Sharma', role: 'citizen' as const },
  { email: 'officer@demo.com', name: 'Rajesh Kumar', role: 'officer' as const },
  { email: 'admin@demo.com', name: 'Anita Desai', role: 'admin' as const },
];

export interface AuthAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  departmentId?: string;
  accountStatus: 'active' | 'inactive' | 'suspended';
}

export class AccountConflictError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'AccountConflictError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export async function createCitizenAccount(input: CitizenRegistration, passwordHash: string): Promise<AuthAccount> {
  const userId = randomUUID();
  try {
    return await withDatabaseTransaction(async (client) => {
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, display_name)
         VALUES ($1, $2, $3, 'citizen', $4)`,
        [userId, input.email, passwordHash, input.name],
      );
      await client.query(
        `INSERT INTO citizen_profiles
          (user_id, full_name, gender, gender_other, date_of_birth, phone_number, address, city, state, pincode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [userId, input.name, input.gender, input.gender === 'other' ? input.genderOther || null : null,
          input.dateOfBirth, input.phone, input.address, input.city, input.state, input.pincode],
      );
      return {
        id: userId,
        email: input.email,
        name: input.name,
        passwordHash,
        role: 'citizen',
        accountStatus: 'active',
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AccountConflictError();
    throw error;
  }
}

async function ensureDemoAccounts(): Promise<void> {
  const existingEmails = await getDatabasePool().query<{ email: string }>(
    `SELECT email FROM users WHERE email = ANY($1)`,
    [DEMO_ACCOUNTS.map((account) => account.email)],
  );
  const existingSet = new Set(existingEmails.rows.map((row) => row.email));
  const missingAccounts = DEMO_ACCOUNTS.filter((account) => !existingSet.has(account.email));

  if (missingAccounts.length === 0) return;

  await withDatabaseTransaction(async (client) => {
    for (const account of missingAccounts) {
      const userId = randomUUID();
      const passwordHash = hashSync('demo123', 10);

      await client.query(
        `INSERT INTO users (id, email, password_hash, role, display_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [userId, account.email, passwordHash, account.role, account.name],
      );

      if (account.role === 'citizen') {
        await client.query(
          `INSERT INTO citizen_profiles
            (user_id, full_name, gender, gender_other, date_of_birth, phone_number, address, city, state, pincode)
           VALUES ($1, $2, 'female', NULL, '1995-02-10', '+919876543210', '123 Demo Street', 'Hyderabad', 'Telangana', '500001')
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, account.name],
        );
      }
    }
  });
}

export async function findAuthAccountByEmail(email: string): Promise<AuthAccount | undefined> {
  await ensureDemoAccounts();

  const result = await getDatabasePool().query<{
    id: string;
    email: string;
    display_name: string;
    password_hash: string;
    role: UserRole;
    department_id: string | null;
    account_status: AuthAccount['accountStatus'];
  }>(
    `SELECT id, email, display_name, password_hash, role, department_id, account_status
     FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  const account = result.rows[0];
  if (!account) return undefined;
  return {
    id: account.id,
    email: account.email,
    name: account.display_name,
    passwordHash: account.password_hash,
    role: account.role,
    ...(account.department_id ? { departmentId: account.department_id } : {}),
    accountStatus: account.account_status,
  };
}

export async function updateLastLogin(userId: string): Promise<void> {
  await getDatabasePool().query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
}