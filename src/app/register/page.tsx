'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { citizenRegistrationSchema, INDIAN_STATES } from '@/server/validation/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    genderOther: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateField = (field: string) => {
    const result = citizenRegistrationSchema.safeParse(formData);
    const issue = result.success ? undefined : result.error.issues.find((item) => item.path[0] === field);
    setFieldErrors((previous) => {
      const next = { ...previous };
      if (issue) next[field] = issue.message;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = citizenRegistrationSchema.safeParse(formData);
    if (!parsed.success) {
      const errors = parsed.error.issues.reduce<Record<string, string>>((result, issue) => {
        const field = String(issue.path[0]);
        if (!result[field]) result[field] = issue.message;
        return result;
      }, {});
      setFieldErrors(errors);
      const firstInvalidField = String(parsed.error.issues[0]?.path[0] || 'name');
      document.getElementById(firstInvalidField)?.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.fields) setFieldErrors(data.error.fields);
        if (res.status === 409) setFieldErrors((previous) => ({ ...previous, email: data.error }));
        setError(typeof data.error === 'string' ? data.error : data.error?.message || 'Registration failed.');
        return;
      }

      router.push('/citizen/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/3 p-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="size-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">CivicResolve</span>
              <span className="ml-1 text-xl font-bold text-primary">AI</span>
            </div>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Register to submit a grievance and monitor its progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" autoComplete="name" value={formData.name} onChange={(e) => update('name', e.target.value)} onBlur={() => validateField('name')} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'name-error' : undefined} />
                  {fieldErrors.name && <p id="name-error" className="text-sm text-destructive">{fieldErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" value={formData.email} onChange={(e) => update('email', e.target.value)} onBlur={() => validateField('email')} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
                  {fieldErrors.email && <p id="email-error" className="text-sm text-destructive">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile number</Label>
                  <Input id="phone" type="tel" autoComplete="tel" placeholder="9876543210" value={formData.phone} onChange={(e) => update('phone', e.target.value)} onBlur={() => validateField('phone')} aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'phone-error' : undefined} />
                  {fieldErrors.phone && <p id="phone-error" className="text-sm text-destructive">{fieldErrors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select id="gender" value={formData.gender} onChange={(e) => update('gender', e.target.value)} onBlur={() => validateField('gender')} aria-invalid={!!fieldErrors.gender} aria-describedby={fieldErrors.gender ? 'gender-error' : undefined} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive">
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="other">Other</option>
                  </select>
                  {fieldErrors.gender && <p id="gender-error" className="text-sm text-destructive">{fieldErrors.gender}</p>}
                </div>

                {formData.gender === 'other' && (
                  <div className="space-y-2">
                    <Label htmlFor="genderOther">Gender description (optional)</Label>
                    <Input id="genderOther" value={formData.genderOther} onChange={(e) => update('genderOther', e.target.value)} onBlur={() => validateField('genderOther')} aria-invalid={!!fieldErrors.genderOther} aria-describedby={fieldErrors.genderOther ? 'genderOther-error' : undefined} />
                    {fieldErrors.genderOther && <p id="genderOther-error" className="text-sm text-destructive">{fieldErrors.genderOther}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                  <Input id="dateOfBirth" type="date" autoComplete="bday" value={formData.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} onBlur={() => validateField('dateOfBirth')} aria-invalid={!!fieldErrors.dateOfBirth} aria-describedby={fieldErrors.dateOfBirth ? 'dateOfBirth-error' : undefined} />
                  {fieldErrors.dateOfBirth && <p id="dateOfBirth-error" className="text-sm text-destructive">{fieldErrors.dateOfBirth}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="new-password" value={formData.password} onChange={(e) => update('password', e.target.value)} onBlur={() => validateField('password')} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'password-error' : undefined} />
                  {fieldErrors.password && <p id="password-error" className="text-sm text-destructive">{fieldErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input id="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} onBlur={() => validateField('confirmPassword')} aria-invalid={!!fieldErrors.confirmPassword} aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined} />
                  {fieldErrors.confirmPassword && <p id="confirmPassword-error" className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" autoComplete="street-address" value={formData.address} onChange={(e) => update('address', e.target.value)} onBlur={() => validateField('address')} aria-invalid={!!fieldErrors.address} aria-describedby={fieldErrors.address ? 'address-error' : undefined} />
                  {fieldErrors.address && <p id="address-error" className="text-sm text-destructive">{fieldErrors.address}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" autoComplete="address-level2" value={formData.city} onChange={(e) => update('city', e.target.value)} onBlur={() => validateField('city')} aria-invalid={!!fieldErrors.city} aria-describedby={fieldErrors.city ? 'city-error' : undefined} />
                  {fieldErrors.city && <p id="city-error" className="text-sm text-destructive">{fieldErrors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State / Union territory</Label>
                  <select id="state" value={formData.state} onChange={(e) => update('state', e.target.value)} onBlur={() => validateField('state')} aria-invalid={!!fieldErrors.state} aria-describedby={fieldErrors.state ? 'state-error' : undefined} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive">
                    <option value="">Select state or union territory</option>
                    {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                  </select>
                  {fieldErrors.state && <p id="state-error" className="text-sm text-destructive">{fieldErrors.state}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" inputMode="numeric" autoComplete="postal-code" value={formData.pincode} onChange={(e) => update('pincode', e.target.value)} onBlur={() => validateField('pincode')} aria-invalid={!!fieldErrors.pincode} aria-describedby={fieldErrors.pincode ? 'pincode-error' : undefined} />
                  {fieldErrors.pincode && <p id="pincode-error" className="text-sm text-destructive">{fieldErrors.pincode}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
                {!loading && <ArrowRight className="size-4" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
