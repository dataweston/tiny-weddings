"use client";
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const emailSignupSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  emailConfirm: z.string().email('Valid email required'),
}).refine((data) => data.email === data.emailConfirm, {
  message: 'Emails must match',
  path: ['emailConfirm'],
});

export function AuthDialog({ open, onOpenChange, onAuthed }: { open: boolean; onOpenChange: (o: boolean) => void; onAuthed?: () => void }) {
  const { googleSignIn, emailLinkStart, user, loading, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const form = useForm<z.infer<typeof emailSignupSchema>>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { firstName: '', lastName: '', email: '', emailConfirm: '' },
  });
  const [linkSent, setLinkSent] = useState(false);

  const handleGoogle = async () => {
    await googleSignIn();
    if (onAuthed) onAuthed();
  };

  const handleEmail = form.handleSubmit(async (values) => {
    await emailLinkStart({ email: values.email, displayName: `${values.firstName} ${values.lastName}` });
    setLinkSent(true);
  });

  if (user && open) {
    // Close on authentication
    onOpenChange(false);
    if (onAuthed) onAuthed();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {mode === 'signup' ? 'Create your account' : 'Log in'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-3">
            <Button onClick={handleGoogle} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 text-white">
              Continue with Google
            </Button>
            <p className="text-center text-xs uppercase text-slate-400">or {mode === 'signup' ? 'sign up' : 'log in'} with email</p>
          </div>
          {!linkSent && (
            <Form {...form}>
              <form onSubmit={handleEmail} className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <Input {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <Input {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" {...field} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="emailConfirm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm email</FormLabel>
                    <Input type="email" {...field} />
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
                  {loading ? 'Sending link...' : 'Send magic link'}
                </Button>
              </form>
            </Form>
          )}
          {linkSent && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Check your inbox for a sign-in link. Open it on this device to finish creating your account.
            </div>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <p className="text-center text-xs text-slate-500">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="text-rose-600 underline" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
              {mode === 'signup' ? 'Log in' : 'Create one'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
