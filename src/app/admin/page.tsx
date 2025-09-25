"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { firebaseAuth, firebaseConfigError, googleProvider } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type RequestStatus = "new" | "in_progress" | "awaiting_client" | "booked";

type RequestMessage = {
  id: string;
  from: "guest" | "admin" | "system";
  body: string;
  timestamp: string;
  viaEmail?: boolean;
};

type EstimateSelection = {
  label: string;
  value: string;
};

type EstimateDetails = {
  planType: "custom" | "streamlined";
  guestCount: number;
  total: number;
  deposit: number;
  notes?: string;
  selections: EstimateSelection[];
};

type AdminRequest = {
  id: string;
  status: RequestStatus;
  eventDate: string;
  submittedAt: string;
  client: {
    primaryName: string;
    partnerName?: string;
    email: string;
    phone: string;
    pronouns?: string;
  };
  estimate: EstimateDetails;
  messages: RequestMessage[];
};

const STATUS_COPY: Record<RequestStatus, { label: string; className: string }> = {
  new: {
    label: "New inquiry",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  in_progress: {
    label: "In progress",
    className: "bg-sky-100 text-sky-700 border border-sky-200",
  },
  awaiting_client: {
    label: "Awaiting client",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  booked: {
    label: "Booked",
    className: "bg-rose-100 text-rose-700 border border-rose-200",
  },
};

const INITIAL_REQUESTS: AdminRequest[] = [
  {
    id: "REQ-2401",
    status: "awaiting_client",
    eventDate: "2025-06-14",
    submittedAt: "2024-11-28T20:42:00.000Z",
    client: {
      primaryName: "Alex Rivera",
      partnerName: "Jordan Lee",
      email: "alex+jordan@example.com",
      phone: "612-555-0199",
      pronouns: "they/them",
    },
    estimate: {
      planType: "custom",
      guestCount: 32,
      total: 7320,
      deposit: 1830,
      notes: "Couple would love to feature a late-night waffle bar and patio lights.",
      selections: [
        { label: "Food style", value: "Plated dinner with duo entrée" },
        { label: "Beverage", value: "Signature cocktails + NA mocktail bar" },
        { label: "Cake", value: "House-made buttercream cutting cake" },
        { label: "Floral", value: "In-house design team, blush palette" },
        { label: "Coordinator", value: "Full planning partner" },
      ],
    },
    messages: [
      {
        id: "msg-2401-1",
        from: "guest",
        body: "Hi Tiny Diner team! We just submitted our details. Could we preview patio lighting options?",
        timestamp: "2024-11-29T16:22:00.000Z",
      },
      {
        id: "msg-2401-2",
        from: "admin",
        body: "Absolutely—adding our patio ambiance gallery to your HoneyBook estimate now!",
        timestamp: "2024-11-29T17:05:00.000Z",
        viaEmail: true,
      },
    ],
  },
  {
    id: "REQ-2402",
    status: "in_progress",
    eventDate: "2025-03-08",
    submittedAt: "2024-10-14T15:18:00.000Z",
    client: {
      primaryName: "Morgan Ellis",
      partnerName: "Sam Patel",
      email: "morgan.sam@example.com",
      phone: "651-555-0154",
      pronouns: "she/they",
    },
    estimate: {
      planType: "streamlined",
      guestCount: 28,
      total: 4000,
      deposit: 1000,
      notes: "Streamlined package with vegetarian-forward passed appetizers.",
      selections: [
        { label: "Experience", value: "Tiny Diner Signature Streamlined" },
        { label: "Add-ons", value: "Ceremony vignette upgrade" },
      ],
    },
    messages: [
      {
        id: "msg-2402-1",
        from: "system",
        body: "Estimate synced to HoneyBook and shared with couple.",
        timestamp: "2024-10-14T15:20:00.000Z",
      },
      {
        id: "msg-2402-2",
        from: "guest",
        body: "Thank you! Can we extend beverage service by 30 minutes?",
        timestamp: "2024-10-15T13:05:00.000Z",
      },
    ],
  },
  {
    id: "REQ-2403",
    status: "booked",
    eventDate: "2025-01-18",
    submittedAt: "2024-09-02T19:11:00.000Z",
    client: {
      primaryName: "Taylor Brooks",
      partnerName: "Riley Chen",
      email: "taylor.riley@example.com",
      phone: "763-555-0180",
      pronouns: "he/they",
    },
    estimate: {
      planType: "custom",
      guestCount: 24,
      total: 5890,
      deposit: 1473,
      notes: "Booked with brunch-focused menu and live painter add-on.",
      selections: [
        { label: "Food style", value: "Brunch grazing tables" },
        { label: "Beverage", value: "Wine + craft NA pairing" },
        { label: "Coordinator", value: "Day-of coordinator" },
        { label: "Officiant", value: "Couple bringing their own" },
      ],
    },
    messages: [
      {
        id: "msg-2403-1",
        from: "guest",
        body: "Deposit paid! Let us know next steps for tasting.",
        timestamp: "2024-09-03T14:12:00.000Z",
        viaEmail: true,
      },
      {
        id: "msg-2403-2",
        from: "admin",
        body: "Congrats! Tastings open mid-November—we\'ll invite you via HoneyBook.",
        timestamp: "2024-09-03T15:30:00.000Z",
      },
    ],
  },
];

const firebaseReady = Boolean(firebaseAuth && googleProvider && !firebaseConfigError);

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>(INITIAL_REQUESTS);
  const [selectedId, setSelectedId] = useState<string | null>(
    INITIAL_REQUESTS.length > 0 ? INITIAL_REQUESTS[0].id : null
  );
  const [replyDraft, setReplyDraft] = useState("");
  const [messageStatus, setMessageStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  useEffect(() => {
    if (!firebaseAuth) return;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsubscribe();
  }, []);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId]
  );

  const handleLogin = async () => {
    if (!firebaseAuth || !googleProvider) return;
    setAuthError(null);
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to authenticate with Google"
      );
    }
  };

  const handleLogout = async () => {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
  };

  const handleSelectRequest = (id: string) => {
    setSelectedId(id);
    setMessageStatus("idle");
    setReplyDraft("");
  };

  const handleSendReply = async () => {
    if (!selectedRequest) return;
    const trimmed = replyDraft.trim();
    if (!trimmed) return;

    const timestamp = new Date().toISOString();
    const message: RequestMessage = {
      id: `admin-${timestamp}`,
      from: "admin",
      body: trimmed,
      timestamp,
      viaEmail: true,
    };

    setMessageStatus("sending");

    setRequests((prev) =>
      prev.map((request) =>
        request.id === selectedRequest.id
          ? {
              ...request,
              status: request.status === "new" ? "in_progress" : request.status,
              messages: [...request.messages, message],
            }
          : request
      )
    );

    setReplyDraft("");

    try {
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          to: selectedRequest.client.email,
          subject: "Tiny Diner Weddings • New message in your estimate",
          message: trimmed,
          sentBy: user?.email ?? user?.displayName ?? "Tiny Diner Admin",
          estimateSummary: selectedRequest.estimate,
        }),
      });

      if (!response.ok) {
        throw new Error("Email notification failed");
      }

      setMessageStatus("sent");
    } catch (error) {
      console.error(error);
      setMessageStatus("error");
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-rose-50 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Tiny Diner Admin</h1>
            <p className="text-sm text-slate-600">
              Review every request, open estimates, and keep guest messaging centralized.
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-medium">{user.displayName ?? "Signed-in admin"}</p>
                {user.email && <p className="text-slate-500">{user.email}</p>}
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          )}
        </header>

        {!firebaseReady && (
          <Alert variant="default" className="border-amber-200 bg-amber-50">
            <AlertTitle>Firebase configuration required</AlertTitle>
            <AlertDescription>
              {firebaseConfigError
                ? firebaseConfigError
                : "Set your NEXT_PUBLIC_FIREBASE_* keys in .env.local to enable secure admin sign-in."}
            </AlertDescription>
          </Alert>
        )}

        {firebaseReady && !user && (
          <Card className="border-rose-100 bg-white/80 shadow-lg shadow-rose-100/40 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in to Admin Console</CardTitle>
              <CardDescription>
                Use your Tiny Diner Google Workspace credentials to access customer profiles and estimates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleLogin} className="bg-rose-600 hover:bg-rose-700 text-white">
                Continue with Google
              </Button>
              {authError && (
                <Alert variant="destructive">
                  <AlertTitle>Sign-in failed</AlertTitle>
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {firebaseReady && user && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card className="border-rose-100 bg-white/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">All Requests</CardTitle>
                <CardDescription>
                  Every inquiry surfaces here with status, couple details, and the connected estimate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.map((request) => {
                  const lastMessage = request.messages[request.messages.length - 1];
                  return (
                    <div
                      key={request.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectRequest(request.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectRequest(request.id);
                        }
                      }}
                      className={cn(
                        "rounded-lg border p-4 text-left transition hover:border-rose-200 hover:bg-rose-50/60 focus:outline-none focus:ring-2 focus:ring-rose-400/70",
                        selectedId === request.id
                          ? "border-rose-300 bg-rose-50/70 shadow-sm"
                          : "border-slate-200/70 bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {request.client.primaryName}
                            {request.client.partnerName ? ` & ${request.client.partnerName}` : ""}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(request.eventDate), "MMM d, yyyy")} • {request.estimate.planType === "custom" ? "Custom" : "Streamlined"}
                          </p>
                        </div>
                        <Badge className={cn("capitalize", STATUS_COPY[request.status].className)}>
                          {STATUS_COPY[request.status].label}
                        </Badge>
                      </div>
                      {lastMessage && (
                        <p className="mt-3 line-clamp-2 text-xs text-slate-600">
                          “{lastMessage.body}”
                        </p>
                      )}
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                        Updated {formatDistanceToNow(new Date(lastMessage?.timestamp ?? request.submittedAt), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {selectedRequest ? (
                <>
                  <Card className="border-slate-200/80 bg-white/90 backdrop-blur">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <CardTitle className="text-2xl font-semibold">
                          {selectedRequest.client.primaryName}
                          {selectedRequest.client.partnerName ? ` & ${selectedRequest.client.partnerName}` : ""}
                        </CardTitle>
                        <CardDescription>
                          Estimate generated {format(new Date(selectedRequest.submittedAt), "MMM d, yyyy 'at' h:mm a")} •
                          Event {format(new Date(selectedRequest.eventDate), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-800">Email:</span> {selectedRequest.client.email}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Phone:</span> {selectedRequest.client.phone}
                        </p>
                        {selectedRequest.client.pronouns && (
                          <p>
                            <span className="font-medium text-slate-800">Pronouns:</span> {selectedRequest.client.pronouns}
                          </p>
                        )}
                        <p>
                          <span className="font-medium text-slate-800">Plan:</span> {selectedRequest.estimate.planType === "custom" ? "Custom" : "Streamlined"}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <section className="rounded-lg border border-slate-200/70 bg-slate-50/80 p-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Estimate Summary
                        </h2>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <p className="text-sm text-slate-600">
                            Guest count: <span className="font-medium text-slate-900">{selectedRequest.estimate.guestCount}</span>
                          </p>
                          <p className="text-sm text-slate-600">
                            Total: <span className="font-medium text-slate-900">{currency.format(selectedRequest.estimate.total)}</span>
                          </p>
                          <p className="text-sm text-slate-600">
                            Deposit due: <span className="font-medium text-slate-900">{currency.format(selectedRequest.estimate.deposit)}</span>
                          </p>
                          {selectedRequest.estimate.notes && (
                            <p className="text-sm text-slate-600 sm:col-span-2">
                              Notes: <span className="font-medium text-slate-900">{selectedRequest.estimate.notes}</span>
                            </p>
                          )}
                        </div>
                        <div className="mt-4 space-y-2">
                          {selectedRequest.estimate.selections.map((selection) => (
                            <p key={selection.label} className="text-sm text-slate-600">
                              <span className="font-medium text-slate-900">{selection.label}:</span> {selection.value}
                            </p>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-lg border border-slate-200/70 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Message Thread
                          </h2>
                          <span className="text-xs text-slate-400">
                            Stored inside estimate & emailed to couple
                          </span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {selectedRequest.messages.map((message) => (
                            <article
                              key={message.id}
                              className={cn(
                                "rounded-lg border p-3 text-sm", 
                                message.from === "admin"
                                  ? "border-rose-200 bg-rose-50/80"
                                  : message.from === "guest"
                                  ? "border-slate-200 bg-slate-50"
                                  : "border-slate-200/70 bg-slate-100/80"
                              )}
                            >
                              <header className="flex items-center justify-between text-xs text-slate-500">
                                <span className="font-medium text-slate-700">
                                  {message.from === "admin"
                                    ? "Tiny Diner"
                                    : message.from === "guest"
                                    ? selectedRequest.client.primaryName
                                    : "System"}
                                </span>
                                <time>
                                  {format(new Date(message.timestamp), "MMM d, yyyy • h:mm a")}
                                </time>
                              </header>
                              <p className="mt-2 text-slate-700">{message.body}</p>
                              {message.viaEmail && (
                                <p className="mt-2 text-[11px] uppercase tracking-wide text-rose-500">
                                  Delivered via email + logged to estimate
                                </p>
                              )}
                            </article>
                          ))}
                        </div>
                        <div className="mt-4 space-y-3">
                          <Textarea
                            value={replyDraft}
                            onChange={(event) => setReplyDraft(event.target.value)}
                            placeholder="Reply to the couple—messages save to HoneyBook and email instantly."
                            className="min-h-[120px]"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <Button
                              onClick={handleSendReply}
                              disabled={messageStatus === "sending" || replyDraft.trim().length === 0}
                              className="bg-rose-600 text-white hover:bg-rose-700"
                            >
                              {messageStatus === "sending" ? "Sending…" : "Send reply"}
                            </Button>
                            {messageStatus === "sent" && (
                              <p className="text-xs text-emerald-600">
                                Message logged to estimate and email triggered.
                              </p>
                            )}
                            {messageStatus === "error" && (
                              <p className="text-xs text-rose-600">
                                Unable to trigger email—try again in a moment.
                              </p>
                            )}
                          </div>
                        </div>
                      </section>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500">
                  Select a request to load its estimate, messages, and profile details.
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
