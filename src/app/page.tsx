"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  startOfDay,
  startOfToday,
} from "date-fns";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  DollarSign,
  HandCoins,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const STREAMLINED_PACKAGE = {
  name: "Tiny Diner Signature",
  headline: "Just show up and celebrate. We handle the rest.",
  description:
    "Our streamlined celebration locks in a curated 4-hour experience with food, beverage, design touches, and a personal Tiny Diner host.",
  inclusions: [
    "Dedicated Tiny Diner event host & team",
    "Up to 80 guests with family-style seasonal menu",
    "Beer, wine, and craft NA beverage service",
    "Tiny Diner layered dessert display",
    "On-site coordination & timeline support",
  ],
  price: 4000,
  depositRate: 0.25,
};

const BASE_PRICING = {
  venueFee: 2600,
  perGuestFood: {
    buffet: 62,
    plated: 88,
    appetizers: 42,
  },
  beveragePerGuest: {
    wine: 26,
    cocktails: 34,
    na: 15,
  },
  bartenderFee: 150,
  cake: {
    need: 480,
    bring: 0,
  },
  floral: {
    inHouse: 780,
    bring: 0,
  },
  coordinator: {
    fullPlanning: 1500,
    dayOf: 750,
    none: 0,
  },
  officiant: {
    provide: 450,
    bring: 0,
  },
};

const PREFERRED_VENDORS = [
  {
    category: "Planning & Coordination",
    vendors: [
      {
        name: "Tiny Diner Experience Team",
        cost: "included",
        contact: "events@tinydiner.com",
        phone: "612-555-0142",
        notes: "Lead coordinator + hospitality captain on day-of",
      },
      {
        name: "North Loop Planning Co.",
        cost: "starting at $1,500",
        contact: "hello@northloopplanning.co",
        phone: "612-555-0190",
        notes: "Full-service planning & design partners",
      },
    ],
  },
  {
    category: "Culinary & Beverage",
    vendors: [
      {
        name: "Tiny Diner Kitchen",
        cost: "$62-$88 per guest",
        contact: "chef@tinydiner.com",
        phone: "612-555-0105",
        notes: "Seasonal menus with vegetarian & vegan highlights",
      },
      {
        name: "Tattersall Spirits",
        cost: "cocktail partnership $34 per guest",
        contact: "events@tattersall.com",
        phone: "952-555-0113",
        notes: "Signature cocktail program + bartender team",
      },
    ],
  },
  {
    category: "Design & Floral",
    vendors: [
      {
        name: "Studio Emme",
        cost: "centerpieces from $780",
        contact: "flora@studioemme.com",
        phone: "612-555-0172",
        notes: "Seasonal floral design, candles, tablescapes",
      },
      {
        name: "Girl Friday",
        cost: "custom installs quoted",
        contact: "design@girlfriday.com",
        phone: "612-555-0154",
        notes: "Room transformations, draping, photo backdrops",
      },
    ],
  },
  {
    category: "Ceremony Partners",
    vendors: [
      {
        name: "Tiny Diner Officiant Collective",
        cost: "$450 flat",
        contact: "officiant@tinydiner.com",
        phone: "612-555-0164",
        notes: "Inclusive officiants aligned with Tiny Diner values",
      },
      {
        name: "Love In The Cities",
        cost: "custom scripts from $375",
        contact: "sayhello@loveinthecities.com",
        phone: "651-555-0147",
        notes: "Personalized ceremony writing + rehearsal support",
      },
    ],
  },
];

const allowedEventWeekdays = new Set([4, 5, 6]); // ThursdayÃ¢â‚¬â€œSaturday

const bookedDateSet = new Set<string>([
  "2024-11-09",
  "2024-11-23",
  "2024-12-07",
  "2025-01-18",
]);

const holdDateSet = new Set<string>([
  "2024-11-16",
  "2024-12-14",
  "2025-02-08",
]);


type AvailabilityStatus = "available" | "hold" | "booked" | "unavailable" | "past";

type Step = "calendar" | "contact" | "plan" | "custom" | "review";

type PlanType = "streamlined" | "custom" | null;

type CustomSelections = {
  guestCount: number;
  foodStyle: "buffet" | "plated" | "appetizers";
  beverage: "wine" | "cocktails" | "na";
  cake: "need" | "bring";
  floral: "inHouse" | "bring";
  coordinator: "fullPlanning" | "dayOf" | "none";
  officiant: "provide" | "bring";
  notes: string;
};

type Message = {
  id: string;
  sender: "Client" | "Tiny Diner";
  body: string;
  timestamp: Date;
};

type BookingState = {
  eventDate: Date | null;
  planType: PlanType;
  client: {
    primaryName: string;
    partnerName: string;
    email: string;
    phone: string;
    pronouns: string;
  };
  streamlinedSummary?: {
    total: number;
    deposit: number;
  };
  customSelections: CustomSelections;
  customEstimate?: {
    lineItems: { label: string; amount: number }[];
    total: number;
    deposit: number;
  };
  syncedToHoneybook: boolean;
  paymentStatus: "unpaid" | "deposit_processing" | "deposit_paid";
};

const contactSchema = z.object({
  primaryName: z.string().min(2, "Please enter a name"),
  partnerName: z.string().optional(),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone required"),
  pronouns: z.string().optional(),
});

const customSchema = z.object({
  guestCount: z
    .string()
    .transform((value) => Number(value))
    .pipe(z.number().min(10, "Minimum 10 guests").max(120, "Tiny Diner max 120")),
  foodStyle: z.enum(["buffet", "plated", "appetizers"]),
  beverage: z.enum(["wine", "cocktails", "na"]),
  cake: z.enum(["need", "bring"]),
  floral: z.enum(["inHouse", "bring"]),
  coordinator: z.enum(["fullPlanning", "dayOf", "none"]),
  officiant: z.enum(["provide", "bring"]),
  notes: z.string().max(1000, "Please keep notes under 1000 characters").optional(),
});

const initialCustomSelections: CustomSelections = {
  guestCount: 80,
  foodStyle: "buffet",
  beverage: "wine",
  cake: "need",
  floral: "inHouse",
  coordinator: "dayOf",
  officiant: "bring",
  notes: "",
};
export default function TinyDinerApp() {
  const [step, setStep] = useState<Step>("calendar");
  const [booking, setBooking] = useState<BookingState>({
    eventDate: null,
    planType: null,
    client: {
      primaryName: "",
      partnerName: "",
      email: "",
      phone: "",
      pronouns: "",
    },
    customSelections: initialCustomSelections,
    syncedToHoneybook: false,
    paymentStatus: "unpaid",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome-note",
      sender: "Tiny Diner",
      body: "We're so glad you're here. Once you enter your details, our team will confirm availability, push everything to HoneyBook, and keep you in the loop inside this shared dashboard.",
      timestamp: new Date(),
    },
  ]);

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      primaryName: "",
      partnerName: "",
      email: "",
      phone: "",
      pronouns: "",
    },
  });

  const customForm = useForm<z.infer<typeof customSchema>>({
    resolver: zodResolver(customSchema),
    defaultValues: {
      guestCount: initialCustomSelections.guestCount,
      foodStyle: initialCustomSelections.foodStyle,
      beverage: initialCustomSelections.beverage,
      cake: initialCustomSelections.cake,
      floral: initialCustomSelections.floral,
      coordinator: initialCustomSelections.coordinator,
      officiant: initialCustomSelections.officiant,
      notes: initialCustomSelections.notes,
    },
  });

  const streamlinedDeposit = useMemo(() => {
    return Math.round(STREAMLINED_PACKAGE.price * STREAMLINED_PACKAGE.depositRate);
  }, []);

  const calendarDisabledDays = useMemo(() => [
    {
      before: startOfToday(),
    },
    (date: Date) => {
      const status = getAvailabilityStatus(date);
      return status !== "available";
    },
  ], []);

  const holdDates = useMemo(
    () => Array.from(holdDateSet).map((iso) => new Date(`${iso}T00:00:00`)),
    []
  );
  const bookedDates = useMemo(
    () => Array.from(bookedDateSet).map((iso) => new Date(`${iso}T00:00:00`)),
    []
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const normalized = startOfDay(date);
    const status = getAvailabilityStatus(normalized);
    if (status !== "available") return;
    setBooking((prev) => ({
      ...prev,
      eventDate: normalized,
      planType: null,
      syncedToHoneybook: false,
    }));
    setStep("contact");
  };

  const handleContactSubmit = contactForm.handleSubmit((values) => {
    setBooking((prev) => ({
      ...prev,
      client: {
        primaryName: values.primaryName,
        partnerName: values.partnerName ?? "",
        email: values.email,
        phone: values.phone,
        pronouns: values.pronouns ?? "",
      },
    }));
    setStep("plan");
  });

  const chooseStreamlined = () => {
    setBooking((prev) => ({
      ...prev,
      planType: "streamlined",
      streamlinedSummary: {
        total: STREAMLINED_PACKAGE.price,
        deposit: streamlinedDeposit,
      },
      customEstimate: undefined,
    }));
    setStep("review");
  };

  const handleCustomSubmit = customForm.handleSubmit((values) => {
    const numericGuestCount = Number(values.guestCount);
    const nextSelections: CustomSelections = {
      guestCount: numericGuestCount,
      foodStyle: values.foodStyle,
      beverage: values.beverage,
      cake: values.cake,
      floral: values.floral,
      coordinator: values.coordinator,
      officiant: values.officiant,
      notes: values.notes ?? "",
    };

    const estimate = buildCustomEstimate(nextSelections);

    setBooking((prev) => ({
      ...prev,
      planType: "custom",
      customSelections: nextSelections,
      customEstimate: estimate,
      streamlinedSummary: undefined,
    }));
    setStep("review");
  });

  const handleSyncHoneybook = async () => {
    if (!booking.eventDate) return;
    setIsSyncing(true);
    try {
      const response = await fetch("/api/honeybook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking,
          estimate: booking.planType === "streamlined" ? booking.streamlinedSummary : booking.customEstimate,
        }),
      });

      if (!response.ok) throw new Error("Failed to sync");

      setBooking((prev) => ({ ...prev, syncedToHoneybook: true }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `client-${Date.now()}`,
        sender: "Client",
        body: text.trim(),
        timestamp: new Date(),
      },
      {
        id: `auto-${Date.now()}`,
        sender: "Tiny Diner",
        body: "Thanks! A coordinator will reply shortly and we'll log this thread inside HoneyBook as well.",
        timestamp: new Date(),
      },
    ]);
  };

  const handleStartPayment = async (method: "ach" | "card") => {
    if (!booking.eventDate) return;
    const amount =
      booking.planType === "streamlined"
        ? booking.streamlinedSummary?.deposit ?? 0
        : booking.customEstimate?.deposit ?? 0;
    setIsProcessingPayment(true);
    try {
      const response = await fetch("/api/payments/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          amount,
          bookingReference: {
            date: booking.eventDate,
            planType: booking.planType,
            client: booking.client,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Payment intent failed");
      }

      const result = await response.json();
      console.info("[TinyDiner] Square stub response", result);

      setBooking((prev) => ({
        ...prev,
        paymentStatus: "deposit_processing",
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const totalEstimate = booking.planType === "streamlined"
    ? booking.streamlinedSummary?.total ?? 0
    : booking.customEstimate?.total ?? 0;
  const depositDue = booking.planType === "streamlined"
    ? booking.streamlinedSummary?.deposit ?? 0
    : booking.customEstimate?.deposit ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f4f1] via-white to-[#f5fbff] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-10">
        <HeaderSection booking={booking} />
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          <Card className="h-fit border-none bg-white/80 shadow-lg shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <CalendarDays className="h-6 w-6 text-rose-500" /> Availability
              </CardTitle>
              <CardDescription>
                Choose your ideal date. Holds and booked dates are shown in color.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Calendar
                mode="single"
                selected={booking.eventDate ?? undefined}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                className="rounded-md border bg-white"
                disabled={calendarDisabledDays as any}
                modifiers={{
                  hold: holdDates,
                  booked: bookedDates,
                }}
                modifiersClassNames={{
                  hold: "bg-amber-200 text-amber-900 hover:bg-amber-200",
                  booked: "bg-rose-200 text-rose-900 opacity-70",
                }}
              />
              <Legend />
              <Alert variant="default" className="bg-sky-50">
                <ShieldCheck className="h-5 w-5 text-sky-600" />
                <AlertTitle>Reservable within 24 hours</AlertTitle>
                <AlertDescription>
                  Once you pick a date, complete the intake to place a deposit and auto-sync your booking to HoneyBook.
                </AlertDescription>
              </Alert>
              {booking.eventDate && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Selected date
                  </p>
                  <p className="text-lg font-medium text-slate-900">
                    {format(booking.eventDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-8">
            <StepIndicator currentStep={step} planType={booking.planType} />

            {step === "calendar" && (
              <Card className="border-dashed border-slate-200 bg-white/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-rose-500" /> Let's begin with your date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Tiny Diner holds one wedding per day. Click on an available date on the calendar to unlock the rest of the onboarding steps.
                  </p>
                </CardContent>
              </Card>
            )}
            {step === "contact" && (
              <Card className="bg-white/70 shadow-lg shadow-slate-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-5 w-5 text-sky-500" /> Tell us about the couple
                  </CardTitle>
                  <CardDescription>
                    We'll link these details with your HoneyBook profile and coordinator workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...contactForm}>
                    <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleContactSubmit}>
                      <FormField
                        control={contactForm.control}
                        name="primaryName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>Primary contact name</FormLabel>
                            <Input placeholder="Alex Rivera" {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="partnerName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>Partner name</FormLabel>
                            <Input placeholder="Jordan Lee" {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>Email</FormLabel>
                            <Input placeholder="events@yourdomain.com" type="email" {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>Phone</FormLabel>
                            <Input placeholder="612-555-0199" {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="pronouns"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>Pronouns</FormLabel>
                            <Input placeholder="they/them" {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="md:col-span-2 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep("calendar")}>
                          Back to calendar
                        </Button>
                        <Button type="submit">Continue to packages</Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {step === "plan" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-2 border-rose-200 bg-white/80 shadow-xl shadow-rose-100/60">
                  <CardHeader className="space-y-2">
                    <Badge className="w-fit bg-rose-500 hover:bg-rose-500">Fastest</Badge>
                    <CardTitle className="text-2xl text-rose-700">{STREAMLINED_PACKAGE.name}</CardTitle>
                    <CardDescription>{STREAMLINED_PACKAGE.headline}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-3xl font-semibold text-rose-700">
                        ${STREAMLINED_PACKAGE.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-rose-600">
                        ${streamlinedDeposit.toLocaleString()} deposit to reserve your date
                      </p>
                    </div>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                      {STREAMLINED_PACKAGE.inclusions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button className="w-full bg-rose-600 text-white hover:bg-rose-700" onClick={chooseStreamlined}>
                      Lock in the signature experience
                    </Button>
                    <p className="text-xs text-rose-600">
                      Ideal if you want Tiny Diner to handle creative direction, food & beverage, and timeline.
                    </p>
                  </CardFooter>
                </Card>

                <Card className="border border-slate-200 bg-white/70">
                  <CardHeader>
                    <CardTitle className="text-xl">Custom build-out</CardTitle>
                    <CardDescription>
                      Design your celebration with mix-and-match services. We'll prepare a bespoke estimate and coordinator brief.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-4xl font-semibold text-slate-800">
                      Tailored pricing
                    </p>
                    <p className="text-sm text-slate-600">
                      Pick culinary format, beverage approach, vendor support, and ceremony services. Pricing updates instantly.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setStep("custom")}>Build a custom plan</Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {step === "custom" && (
              <Card className="bg-white/80 shadow-lg shadow-slate-200/60">
                <CardHeader>
                  <CardTitle className="text-2xl">Customize your celebration</CardTitle>
                  <CardDescription>
                    We'll translate these answers into a working estimate and HoneyBook project board.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...customForm}>
                    <form className="grid gap-6" onSubmit={handleCustomSubmit}>
                      <FormField
                        control={customForm.control}
                        name="guestCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guest count</FormLabel>
                            <Input type="number" min={10} max={120} {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={customForm.control}
                          name="foodStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dining style</FormLabel>
                              <RadioGroup
                                className="grid gap-3"
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <OptionCard value="buffet" title="Seasonal buffet" subtitle="Best for relaxed flow" />
                                <OptionCard value="plated" title="Coursed & plated" subtitle="Elevated dining with staffing" />
                                <OptionCard value="appetizers" title="Passed appetizers" subtitle="Cocktail-forward mix & mingle" />
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={customForm.control}
                          name="beverage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Beverage</FormLabel>
                              <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                <OptionCard value="wine" title="Beer, wine & NA" subtitle="Local selections + coffee service" />
                                <OptionCard value="cocktails" title="Signature cocktails" subtitle="Custom cocktail design + bartender" />
                                <OptionCard value="na" title="Zero-proof" subtitle="Craft sodas, shrubs, espresso" />
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={customForm.control}
                          name="cake"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cake or dessert</FormLabel>
                              <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                <OptionCard value="need" title="We need Tiny Diner to provide" subtitle="Layered buttercream cakes & dessert table" />
                                <OptionCard value="bring" title="We'll bring our own" subtitle="Storage & service support included" />
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={customForm.control}
                          name="floral"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Floral & decor</FormLabel>
                              <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                <OptionCard value="inHouse" title="Curated by Tiny Diner" subtitle="Partner florists with signature palette" />
                                <OptionCard value="bring" title="We'll collaborate with our florist" subtitle="Space walk-through included" />
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={customForm.control}
                          name="coordinator"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Coordination support</FormLabel>
                              <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                <OptionCard value="fullPlanning" title="Planning in advance" subtitle="12-week planning partnership" />
                                <OptionCard value="dayOf" title="Day-of lead" subtitle="Timeline, vendors, and onsite management" />
                                <OptionCard value="none" title="We have our own" subtitle="We'll still provide Tiny Diner host" />
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={customForm.control}
                          name="officiant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Officiant</FormLabel>
                              <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                <OptionCard value="provide" title="Tiny Diner officiant" subtitle="Inclusive ceremony scripts + rehearsal" />
                                <OptionCard value="bring" title="We'll bring our own" subtitle="We'll coordinate timeline + mic" />
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={customForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anything else we should know?</FormLabel>
                            <Textarea placeholder="Tell us about your vision, must-haves, or accessibility notes." rows={4} {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep("plan")}>Back</Button>
                        <Button type="submit">Review estimate</Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {step === "review" && booking.eventDate && (
              <ReviewDashboard
                booking={booking}
                messages={messages}
                onSendMessage={handleSendMessage}
                onSyncHoneybook={handleSyncHoneybook}
                syncing={isSyncing}
                onStartPayment={handleStartPayment}
                processingPayment={isProcessingPayment}
                totalEstimate={totalEstimate}
                depositDue={depositDue}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function HeaderSection({ booking }: { booking: BookingState }) {
  return (
    <header className="flex flex-col gap-3 border-b border-slate-200/60 pb-6 text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-20 w-36 items-center justify-center rounded-xl border border-rose-100 bg-white/80 p-2 shadow-sm">
            <Image src="/tiny-diner-logo.svg" alt="Tiny Diner logo" width={208} height={96} priority />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Tiny Diner</p>
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
              Wedding Onboarding & Booking Portal
            </h1>
          </div>
        </div>
        <Badge className={cn(
          "rounded-full px-6 py-2 text-sm",
          booking.planType ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-800"
        )}>
          {booking.planType ? "In Progress" : "Start with your date"}
        </Badge>
      </div>
      <p className="max-w-2xl text-sm text-slate-600">
        Welcome to the Tiny Diner wedding experience. Reserve your date, capture intake details, and stay aligned with your coordinatorâ€”all synced with HoneyBook and ready for secure Square payments.
      </p>
    </header>
  );
}

function StepIndicator({ currentStep, planType }: { currentStep: Step; planType: PlanType }) {
  const steps: { id: Step; label: string }[] = [
    { id: "calendar", label: "Select date" },
    { id: "contact", label: "Client info" },
    { id: "plan", label: "Choose path" },
    { id: "custom", label: "Customize" },
    { id: "review", label: "Dashboard" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id || (currentStep === "review" && step.id === "custom" && planType === "streamlined");
        const isComplete = steps.findIndex((s) => s.id === currentStep) > index && !(step.id === "custom" && planType === "streamlined");
        const displayBadge = step.id === "custom" && planType === "streamlined";

        return (
          <div className="flex items-center gap-3" key={step.id}>
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold",
                isComplete && "border-emerald-500 bg-emerald-500 text-white",
                isActive && !isComplete && "border-rose-500 bg-rose-500 text-white",
                !isActive && !isComplete && "border-slate-200 bg-white text-slate-500"
              )}
            >
              {displayBadge ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-xs uppercase tracking-[0.18em] text-slate-500",
                isActive && "text-rose-600",
                isComplete && "text-emerald-600"
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && <span className="text-slate-200">/</span>}
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <LegendItem color="bg-emerald-500" label="Available" />
      <LegendItem color="bg-amber-400" label="Hold" />
      <LegendItem color="bg-rose-400" label="Booked" />
      <LegendItem color="bg-slate-200" label="Unavailable" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-full", color)} />
      {label}
    </span>
  );
}

function OptionCard({
  value,
  title,
  subtitle,
}: {
  value: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Label
      htmlFor={value}
      className="group block cursor-pointer rounded-lg border border-slate-200 bg-white/70 p-4 text-sm shadow-sm transition hover:border-rose-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <RadioGroupItem value={value} id={value} className="border-rose-500 text-rose-500" />
      </div>
    </Label>
  );
}
function ReviewDashboard({
  booking,
  messages,
  onSendMessage,
  onSyncHoneybook,
  syncing,
  onStartPayment,
  processingPayment,
  totalEstimate,
  depositDue,
}: {
  booking: BookingState;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onSyncHoneybook: () => void;
  syncing: boolean;
  onStartPayment: (method: "ach" | "card") => void;
  processingPayment: boolean;
  totalEstimate: number;
  depositDue: number;
}) {
  const [draftMessage, setDraftMessage] = useState("");

  const summaryItems = booking.planType === "streamlined"
    ? STREAMLINED_PACKAGE.inclusions.map((item) => ({ label: item }))
    : booking.customEstimate?.lineItems.map((item) => ({
        label: item.label,
        amount: item.amount,
      })) ?? [];

  return (
    <Card className="border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/70">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <CalendarDays className="h-4 w-4 text-rose-500" />
              {format(booking.eventDate!, "MMM d, yyyy")} Ã‚Â· Tiny Diner
            </div>
            <CardTitle className="text-3xl text-slate-900">Shared wedding dashboard</CardTitle>
            <CardDescription>
              Automatically generated summary for you and the Tiny Diner coordination team. Save, share, and revisit anytime.
            </CardDescription>
          </div>
          <Badge className={cn(
            "rounded-full px-4 py-2",
            booking.planType === "streamlined" ? "bg-rose-500" : "bg-slate-800"
          )}>
            {booking.planType === "streamlined" ? "Signature" : "Custom"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <Card className="border border-emerald-200 bg-emerald-50/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <Sparkles className="h-5 w-5" /> Selected experience
                </CardTitle>
                <CardDescription className="text-emerald-700/80">
                  {booking.planType === "streamlined"
                    ? "All-in celebration with curated menu, beverage, and in-house coordination."
                    : "Custom configuration ready for coordinator review and vendor outreach."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-emerald-600">Client</p>
                    <p className="font-medium text-emerald-800">
                      {booking.client.primaryName}
                      {booking.client.partnerName && ` & ${booking.client.partnerName}`}
                    </p>
                    <p className="text-xs text-emerald-700/70">{booking.client.email}</p>
                    <p className="text-xs text-emerald-700/70">{booking.client.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-emerald-600">Plan</p>
                    <p className="font-medium text-emerald-800">
                      {booking.planType === "streamlined" ? STREAMLINED_PACKAGE.name : "Custom Tiny Diner Wedding"}
                    </p>
                    <p className="text-xs text-emerald-700/70">
                      {booking.planType === "streamlined"
                        ? `${STREAMLINED_PACKAGE.inclusions.length} curated inclusions`
                        : `${booking.customSelections.guestCount} guests Ã‚Â· ${readableFood(booking.customSelections.foodStyle)} dining`}
                    </p>
                  </div>
                </div>
                <Separator className="bg-emerald-200" />
                <ul className="space-y-2">
                  {summaryItems.map((item) => (
                    <li className="flex items-center justify-between text-xs text-emerald-800" key={item.label}>
                      <span>{item.label}</span>
                      {typeof item.amount === "number" && (
                        <span className="font-semibold">
                          ${item.amount.toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {booking.planType === "custom" && booking.customSelections.notes && (
              <Card className="border border-slate-200 bg-white/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <MessageCircle className="h-5 w-5 text-rose-500" /> Couple notes
                  </CardTitle>
                  <CardDescription>
                    Shared with your coordinator and included in the HoneyBook project brief.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{booking.customSelections.notes}</p>
                </CardContent>
              </Card>
            )}

            <Card className="border border-slate-200 bg-white/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <HandCoins className="h-5 w-5 text-rose-500" /> Estimate & deposit
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-500">Projected total</p>
                  <p className="text-2xl font-semibold text-slate-900">${totalEstimate.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Deposit due to reserve</p>
                  <p className="text-2xl font-semibold text-rose-600">${depositDue.toLocaleString()}</p>
                  <p className="text-xs text-rose-500">ACH encouraged Ã¢â‚¬Â¢ Card adds 3% processing</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Status</p>
                  <StatusPill status={booking.paymentStatus} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button
                  onClick={() => onStartPayment("ach")}
                  disabled={processingPayment}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {processingPayment ? "Preparing ACH checkout..." : "Submit ACH deposit"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onStartPayment("card")}
                  disabled={processingPayment}
                >
                  Use credit card (+3%)
                </Button>
                <p className="text-xs text-slate-500">
                  Square handles payment processing. Funds post to Tiny Diner events account with automatic receipt.
                </p>
              </CardFooter>
            </Card>

            <Card className="border border-slate-200 bg-white/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="h-5 w-5 text-sky-500" /> HoneyBook sync
                </CardTitle>
                <CardDescription>
                  Push this intake into your HoneyBook workspace for contracts, files, and automations.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-700">
                    {booking.syncedToHoneybook
                      ? "Synced! We'll keep this dashboard in lockstep with your HoneyBook project."
                      : "One click creates or updates the HoneyBook project with this intake, timeline, and message history."}
                  </p>
                </div>
                <Button onClick={onSyncHoneybook} disabled={syncing || booking.syncedToHoneybook}>
                  {booking.syncedToHoneybook ? "Synced" : syncing ? "Syncing..." : "Sync to HoneyBook"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="vendors" className="space-y-4">
            {PREFERRED_VENDORS.map((section) => (
              <VendorSection key={section.category} section={section} />
            ))}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card className="border border-slate-200 bg-white/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <MessageCircle className="h-5 w-5 text-rose-500" /> Shared message log
                </CardTitle>
                <CardDescription>
                  Notes stay in sync for you, your partner, and your coordinator. We'll push everything to HoneyBook too.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-lg border border-slate-200 bg-white/90 p-3 text-sm shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{message.sender}</span>
                        <span>{format(message.timestamp, "MMM d Ã‚Â· h:mm a")}</span>
                      </div>
                      <p className="mt-1 text-slate-700">{message.body}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a note to Tiny Diner..."
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    rows={3}
                  />
                  <Button onClick={() => {
                    onSendMessage(draftMessage);
                    setDraftMessage("");
                  }} className="h-fit self-end">
                    <SendIcon />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="border border-slate-200 bg-white/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <DollarSign className="h-5 w-5 text-emerald-500" /> Payment schedule
                </CardTitle>
                <CardDescription>
                  Secure Square payments with ACH or credit. You can adjust milestones in HoneyBook after syncing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <PaymentMilestone
                    label="Deposit"
                    amount={depositDue}
                    due="Within 24 hours of selecting date"
                    status={booking.paymentStatus === "deposit_paid" ? "Paid" : booking.paymentStatus === "deposit_processing" ? "Processing" : "Pending"}
                  />
                  <PaymentMilestone
                    label="Planning checkpoint"
                    amount={Math.round(totalEstimate * 0.35)}
                    due="90 days prior"
                    status="Scheduled"
                  />
                  <PaymentMilestone
                    label="Final balance"
                    amount={totalEstimate - depositDue - Math.round(totalEstimate * 0.35)}
                    due="14 days prior"
                    status="Scheduled"
                  />
                </div>
                <Alert variant="default" className="bg-rose-50">
                  <AlertTitle>Refund policy</AlertTitle>
                  <AlertDescription>
                    Deposits are non-refundable within 120 days of your event date. Reschedule requests are handled via HoneyBook.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function VendorSection({
  section,
}: {
  section: (typeof PREFERRED_VENDORS)[number];
}) {
  return (
    <Card className="border border-slate-200 bg-white/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Sparkles className="h-5 w-5 text-rose-500" /> {section.category}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {section.vendors.map((vendor) => (
          <div key={vendor.name} className="space-y-2 rounded-lg border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{vendor.name}</p>
                <p className="text-xs text-slate-500">{vendor.cost}</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Message</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Message {vendor.name}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-600">
                    Compose a note to {vendor.name}. We'll relay through HoneyBook while keeping this thread updated.
                  </p>
                  <Textarea rows={5} placeholder={`Write a message to ${vendor.name}`} />
                  <Button>Send via Tiny Diner concierge</Button>
                </DialogContent>
              </Dialog>
            </div>
            <div className="text-xs text-slate-600">
              <p>Email: {vendor.contact}</p>
              <p>Phone: {vendor.phone}</p>
            </div>
            <p className="text-xs text-slate-500">{vendor.notes}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PaymentMilestone({
  label,
  amount,
  due,
  status,
}: {
  label: string;
  amount: number;
  due: string;
  status: "Pending" | "Processing" | "Paid" | "Scheduled";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/60 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">${amount.toLocaleString()}</p>
      <p className="text-xs text-slate-500">{due}</p>
      <Badge className={cn(
        "mt-3 rounded-full",
        status === "Pending" && "bg-amber-500",
        status === "Processing" && "bg-sky-500",
        status === "Paid" && "bg-emerald-500",
        status === "Scheduled" && "bg-slate-800"
      )}>
        {status}
      </Badge>
    </div>
  );
}

function StatusPill({ status }: { status: BookingState["paymentStatus"] }) {
  let label: string;
  switch (status) {
    case "deposit_paid":
      label = "Deposit paid";
      break;
    case "deposit_processing":
      label = "Processing";
      break;
    default:
      label = "Pending";
  }
  const badgeClass = cn(
    "rounded-full px-3 py-1",
    status === "deposit_paid" && "bg-emerald-500",
    status === "deposit_processing" && "bg-sky-500",
    status === "unpaid" && "bg-amber-500"
  );
  return <Badge className={badgeClass}>{label}</Badge>;
}

function SendIcon() {
  return <MessageCircle className="h-4 w-4" />;
}

function readableFood(style: CustomSelections["foodStyle"]) {
  switch (style) {
    case "buffet":
      return "buffet";
    case "plated":
      return "plated";
    case "appetizers":
      return "passed apps";
    default:
      return style;
  }
}
function buildCustomEstimate(selections: CustomSelections) {
  const guestCount = selections.guestCount;
  const lineItems: { label: string; amount: number }[] = [];

  lineItems.push({ label: "Venue + staffing", amount: BASE_PRICING.venueFee });
  const foodAmount = Math.round(BASE_PRICING.perGuestFood[selections.foodStyle] * guestCount);
  lineItems.push({
    label: `${readableFood(selections.foodStyle)} dining (${guestCount} guests)`,
    amount: foodAmount,
  });

  const beverageAmount = Math.round(BASE_PRICING.beveragePerGuest[selections.beverage] * guestCount);
  lineItems.push({
    label: `${beverageLabel(selections.beverage)} (${guestCount} guests)`,
    amount: beverageAmount,
  });

  if (selections.beverage !== "na") {
    lineItems.push({ label: "Bartender team", amount: BASE_PRICING.bartenderFee });
  }

  lineItems.push({ label: cakeLabel(selections.cake), amount: BASE_PRICING.cake[selections.cake] });
  lineItems.push({ label: floralLabel(selections.floral), amount: BASE_PRICING.floral[selections.floral] });
  lineItems.push({ label: coordinatorLabel(selections.coordinator), amount: BASE_PRICING.coordinator[selections.coordinator] });
  lineItems.push({ label: officiantLabel(selections.officiant), amount: BASE_PRICING.officiant[selections.officiant] });

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const deposit = Math.round(total * 0.25);

  return {
    lineItems,
    total,
    deposit,
  };
}

function beverageLabel(beverage: CustomSelections["beverage"]) {
  switch (beverage) {
    case "wine":
      return "Beer, wine & NA service";
    case "cocktails":
      return "Signature cocktail program";
    case "na":
      return "Zero-proof beverage service";
    default:
      return "Beverage";
  }
}

function cakeLabel(cake: CustomSelections["cake"]) {
  return cake === "need" ? "Tiny Diner desserts" : "Client-provided desserts";
}

function floralLabel(option: CustomSelections["floral"]) {
  return option === "inHouse" ? "Tiny Diner floral & tablescape" : "External florist support";
}

function coordinatorLabel(option: CustomSelections["coordinator"]) {
  switch (option) {
    case "fullPlanning":
      return "Full planning partnership";
    case "dayOf":
      return "Day-of coordination";
    case "none":
      return "External coordinator";
    default:
      return "Coordination";
  }
}

function officiantLabel(option: CustomSelections["officiant"]) {
  return option === "provide" ? "Tiny Diner officiant" : "Client-provided officiant";
}

function getAvailabilityStatus(date: Date): AvailabilityStatus {
  const today = startOfToday();
  if (isBefore(date, today)) {
    return "past";
  }
  const iso = format(date, "yyyy-MM-dd");
  if (!allowedEventWeekdays.has(date.getDay())) {
    return "unavailable";
  }
  if (bookedDateSet.has(iso)) {
    return "booked";
  }
  if (holdDateSet.has(iso)) {
    return "hold";
  }
  return "available";
}

function buildAvailabilityMap() {
  const start = startOfToday();
  const end = endOfMonth(addMonths(start, 5));
  const days = eachDayOfInterval({ start, end });
  const map = new Map<string, AvailabilityStatus>();
  days.forEach((date) => {
    map.set(format(date, "yyyy-MM-dd"), getAvailabilityStatus(date));
  });
  return map;
}


















