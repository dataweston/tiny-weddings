"use client";

import { useCallback, useEffect, useState } from "react";
import {
  
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
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { useIsMobile } from "@/lib/use-is-mobile";

const STREAMLINED_PACKAGE = {
  name: "Tiny Diner Signature",
  headline: "Just show up and celebrate. We handle the rest.",
  description:
    "Our streamlined celebration locks in a curated 4-hour experience with food, beverage, design touches, and a personal Tiny Diner host.",
  inclusions: [
    "Dedicated Tiny Diner event host & team",
    "Up to 35 guests",
    "Passed appetizers by Local Effort",
    "Beer, wine, and craft NA beverage service",
    "On-site coordination & timeline support",
  ],
  price: 4000,
  depositRate: 0.25,
};

const STREAMLINED_DEPOSIT = Math.round(
  STREAMLINED_PACKAGE.price * STREAMLINED_PACKAGE.depositRate
);

const VENUE_VENDOR = "Tiny Diner Venue & Staffing";
const VENUE_BASE_RATE = 2600;

type PricingType = "perGuest" | "flat";

type ServiceOption<Value extends string = string> = {
  value: Value;
  title: string;
  subtitle: string;
  pricingType: PricingType;
  defaultPrice: number;
  vendorOverride?: string;
};

const FOOD_VENDOR = "Local Effort";
const FOOD_OPTIONS = [
  {
    value: "buffet",
    title: "Local Effort seasonal buffet",
    subtitle: "Relaxed, grazing stations ideal for mingling",
    pricingType: "perGuest",
    defaultPrice: 62,
  },
  {
    value: "plated",
    title: "Local Effort plated dinner",
    subtitle: "Coursed dining with full service team",
    pricingType: "perGuest",
    defaultPrice: 88,
  },
  {
    value: "appetizers",
    title: "Local Effort passed appetizers",
    subtitle: "Cocktail-forward mix & mingle experience",
    pricingType: "perGuest",
    defaultPrice: 42,
  },
  {
    value: "notRequired",
    title: "Outside catering support",
    subtitle: "Not required — facility support fee per guest",
    pricingType: "perGuest",
    defaultPrice: 12,
    vendorOverride: "Tiny Diner Venue Support",
  },
] as const satisfies readonly ServiceOption[];

const BEVERAGE_VENDOR = "Tiny Diner Beverage Collective";
const BEVERAGE_OPTIONS = [
  {
    value: "wine",
    title: "Beer, wine & NA bar",
    subtitle: "Local selections plus coffee service",
    pricingType: "perGuest",
    defaultPrice: 26,
  },
  {
    value: "cocktails",
    title: "Signature cocktail program",
    subtitle: "Custom drinks designed with our bar team",
    pricingType: "perGuest",
    defaultPrice: 34,
  },
  {
    value: "na",
    title: "Zero-proof service",
    subtitle: "Craft sodas, shrubs, and espresso bar",
    pricingType: "perGuest",
    defaultPrice: 15,
  },
  {
    value: "notRequired",
    title: "Outside beverage program",
    subtitle: "Not required — service oversight fee",
    pricingType: "flat",
    defaultPrice: 250,
    vendorOverride: "Tiny Diner Venue Support",
  },
] as const satisfies readonly ServiceOption[];

const CAKE_VENDOR = "Local Effort";
const CAKE_OPTIONS = [
  {
    value: "need",
    title: "Local Effort dessert table",
    subtitle: "Layered buttercream cakes & sweets",
    pricingType: "flat",
    defaultPrice: 480,
  },
  {
    value: "bring",
    title: "Couple-provided desserts",
    subtitle: "Storage & service support from our team",
    pricingType: "flat",
    defaultPrice: 180,
    vendorOverride: "Tiny Diner Venue Support",
  },
  {
    value: "notRequired",
    title: "No dessert service",
    subtitle: "Not required for this celebration",
    pricingType: "flat",
    defaultPrice: 0,
  },
] as const satisfies readonly ServiceOption[];

const FLORAL_VENDOR = "Studio Emme";
const FLORAL_OPTIONS = [
  {
    value: "inHouse",
    title: "Studio Emme floral design",
    subtitle: "Seasonal florals with candles and styling",
    pricingType: "flat",
    defaultPrice: 780,
  },
  {
    value: "bring",
    title: "Outside florist collaboration",
    subtitle: "Timeline, setup, and breakdown coordination",
    pricingType: "flat",
    defaultPrice: 220,
    vendorOverride: "Tiny Diner Venue Support",
  },
  {
    value: "notRequired",
    title: "Minimal styling only",
    subtitle: "Not required — couple will keep decor simple",
    pricingType: "flat",
    defaultPrice: 0,
  },
] as const satisfies readonly ServiceOption[];

const COORDINATOR_VENDOR = "Tiny Diner Experience Team";
const COORDINATOR_OPTIONS = [
  {
    value: "fullPlanning",
    title: "Full planning partnership",
    subtitle: "12-week planning with design and logistics",
    pricingType: "flat",
    defaultPrice: 1500,
  },
  {
    value: "dayOf",
    title: "Day-of coordination",
    subtitle: "Timeline management + vendor wrangling",
    pricingType: "flat",
    defaultPrice: 750,
  },
  {
    value: "notRequired",
    title: "Venue host handoff",
    subtitle: "Not required — includes operations lead",
    pricingType: "flat",
    defaultPrice: 250,
    vendorOverride: "Tiny Diner Venue Support",
  },
] as const satisfies readonly ServiceOption[];

const OFFICIANT_VENDOR = "Tiny Diner Officiant Collective";
const OFFICIANT_OPTIONS = [
  {
    value: "provide",
    title: "Tiny Diner officiant",
    subtitle: "Inclusive scripts + rehearsal support",
    pricingType: "flat",
    defaultPrice: 450,
  },
  {
    value: "bring",
    title: "Couple-provided officiant",
    subtitle: "Timeline coordination & mic check",
    pricingType: "flat",
    defaultPrice: 180,
    vendorOverride: "Tiny Diner Venue Support",
  },
  {
    value: "notRequired",
    title: "No officiant support",
    subtitle: "Not required for this event",
    pricingType: "flat",
    defaultPrice: 0,
  },
] as const satisfies readonly ServiceOption[];

function getDefaultPrice(options: readonly ServiceOption[], value: string) {
  const option = options.find((item) => item.value === value);
  return option ? option.defaultPrice : options[0]?.defaultPrice ?? 0;
}

function getOptionByValue<T extends ServiceOption>(options: readonly T[], value: string): T {
  return (options.find((item) => item.value === value) ?? options[0]) as T;
}

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
        name: "Local Effort",
        cost: "$62-$88 per guest",
        contact: "events@localeffort.com",
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

const allowedEventWeekdays = new Set([4, 5, 6]); // Thursday–Saturday

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

const BOOKED_DATES = Array.from(
  bookedDateSet,
  isoDateStringToMidnightDate
);
const HOLD_DATES = Array.from(holdDateSet, isoDateStringToMidnightDate);


type AvailabilityStatus = "available" | "hold" | "booked" | "unavailable" | "past";

type Step = "welcome" | "calendar" | "contact" | "plan" | "custom" | "review";

type PlanType = "streamlined" | "custom" | null;

type FoodStyle = (typeof FOOD_OPTIONS)[number]["value"];
type BeverageChoice = (typeof BEVERAGE_OPTIONS)[number]["value"];
type CakeChoice = (typeof CAKE_OPTIONS)[number]["value"];
type FloralChoice = (typeof FLORAL_OPTIONS)[number]["value"];
type CoordinatorChoice = (typeof COORDINATOR_OPTIONS)[number]["value"];
type OfficiantChoice = (typeof OFFICIANT_OPTIONS)[number]["value"];

type CustomSelections = {
  guestCount: number;
  foodStyle: FoodStyle;
  beverage: BeverageChoice;
  cake: CakeChoice;
  floral: FloralChoice;
  coordinator: CoordinatorChoice;
  officiant: OfficiantChoice;
  foodPrice: number;
  beveragePrice: number;
  cakePrice: number;
  floralPrice: number;
  coordinatorPrice: number;
  officiantPrice: number;
  notes: string;
};

type Message = {
  id: string;
  sender: "Client" | "Tiny Diner";
  body: string;
  timestamp: Date;
};

type EstimateLineItem = {
  label: string;
  amount: number;
  vendor?: string;
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
    lineItems: EstimateLineItem[];
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
  guestCount: z.coerce
    .number()
    .min(10, "Minimum 10 guests")
    .max(120, "Tiny Diner max 120"),
  foodStyle: z.enum(["buffet", "plated", "appetizers", "notRequired"]),
  beverage: z.enum(["wine", "cocktails", "na", "notRequired"]),
  cake: z.enum(["need", "bring", "notRequired"]),
  floral: z.enum(["inHouse", "bring", "notRequired"]),
  coordinator: z.enum(["fullPlanning", "dayOf", "notRequired"]),
  officiant: z.enum(["provide", "bring", "notRequired"]),
  foodPrice: z.coerce.number().min(0, "Please enter a non-negative amount"),
  beveragePrice: z.coerce.number().min(0, "Please enter a non-negative amount"),
  cakePrice: z.coerce.number().min(0, "Please enter a non-negative amount"),
  floralPrice: z.coerce.number().min(0, "Please enter a non-negative amount"),
  coordinatorPrice: z.coerce.number().min(0, "Please enter a non-negative amount"),
  officiantPrice: z.coerce.number().min(0, "Please enter a non-negative amount"),
  notes: z
    .string()
    .max(1000, "Please keep notes under 1000 characters")
    .optional()
    .transform((value) => value?.trim() ?? ""),
});

const initialCustomSelections: CustomSelections = {
  guestCount: 35,
  foodStyle: "buffet",
  beverage: "wine",
  cake: "need",
  floral: "inHouse",
  coordinator: "dayOf",
  officiant: "bring",
  foodPrice: getDefaultPrice(FOOD_OPTIONS, "buffet"),
  beveragePrice: getDefaultPrice(BEVERAGE_OPTIONS, "wine"),
  cakePrice: getDefaultPrice(CAKE_OPTIONS, "need"),
  floralPrice: getDefaultPrice(FLORAL_OPTIONS, "inHouse"),
  coordinatorPrice: getDefaultPrice(COORDINATOR_OPTIONS, "dayOf"),
  officiantPrice: getDefaultPrice(OFFICIANT_OPTIONS, "bring"),
  notes: "",
};

// Demo mock customer details for showcase; replace with real user input handling in production
const DEMO_CUSTOMER = {
  primaryName: "Alex Rivera",
  partnerName: "Jordan Lee",
  email: "alex+jordan@example.com",
  phone: "612-555-0199",
  pronouns: "they/them",
};
// Keep a reference (noop) ensuring bundlers treat it as used in development scenarios
// DEMO_CUSTOMER will be used for initial prefill
export default function TinyDinerApp() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>("welcome");
  const [booking, setBooking] = useState<BookingState>({
    eventDate: null,
    planType: null,
    client: {
      ...DEMO_CUSTOMER,
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
  body: "We&apos;re so glad you&apos;re here. Once you enter your details, our team will confirm availability, push everything to HoneyBook, and keep you in the loop inside this shared dashboard.",
      timestamp: new Date(),
    },
  ]);

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { ...DEMO_CUSTOMER },
  });

  const customForm = useForm<z.infer<typeof customSchema>>({
    // Cast needed due to zod preprocess + optional field nuance causing generic inference friction
    resolver: zodResolver(customSchema) as unknown as Resolver<z.infer<typeof customSchema>>,
    defaultValues: {
      guestCount: initialCustomSelections.guestCount,
      foodStyle: initialCustomSelections.foodStyle,
      beverage: initialCustomSelections.beverage,
      cake: initialCustomSelections.cake,
      floral: initialCustomSelections.floral,
      coordinator: initialCustomSelections.coordinator,
      officiant: initialCustomSelections.officiant,
      foodPrice: initialCustomSelections.foodPrice,
      beveragePrice: initialCustomSelections.beveragePrice,
      cakePrice: initialCustomSelections.cakePrice,
      floralPrice: initialCustomSelections.floralPrice,
      coordinatorPrice: initialCustomSelections.coordinatorPrice,
      officiantPrice: initialCustomSelections.officiantPrice,
      notes: initialCustomSelections.notes,
    },
  });

  const watchedFoodStyle = customForm.watch("foodStyle");
  const watchedBeverage = customForm.watch("beverage");
  const watchedCake = customForm.watch("cake");
  const watchedFloral = customForm.watch("floral");
  const watchedCoordinator = customForm.watch("coordinator");
  const watchedOfficiant = customForm.watch("officiant");

  useEffect(() => {
    const option = getOptionByValue(FOOD_OPTIONS, watchedFoodStyle);
    if (customForm.getValues("foodPrice") !== option.defaultPrice) {
      customForm.setValue("foodPrice", option.defaultPrice, { shouldDirty: false });
    }
  }, [watchedFoodStyle, customForm]);

  useEffect(() => {
    const option = getOptionByValue(BEVERAGE_OPTIONS, watchedBeverage);
    if (customForm.getValues("beveragePrice") !== option.defaultPrice) {
      customForm.setValue("beveragePrice", option.defaultPrice, { shouldDirty: false });
    }
  }, [watchedBeverage, customForm]);

  useEffect(() => {
    const option = getOptionByValue(CAKE_OPTIONS, watchedCake);
    if (customForm.getValues("cakePrice") !== option.defaultPrice) {
      customForm.setValue("cakePrice", option.defaultPrice, { shouldDirty: false });
    }
  }, [watchedCake, customForm]);

  useEffect(() => {
    const option = getOptionByValue(FLORAL_OPTIONS, watchedFloral);
    if (customForm.getValues("floralPrice") !== option.defaultPrice) {
      customForm.setValue("floralPrice", option.defaultPrice, { shouldDirty: false });
    }
  }, [watchedFloral, customForm]);

  useEffect(() => {
    const option = getOptionByValue(COORDINATOR_OPTIONS, watchedCoordinator);
    if (customForm.getValues("coordinatorPrice") !== option.defaultPrice) {
      customForm.setValue("coordinatorPrice", option.defaultPrice, { shouldDirty: false });
    }
  }, [watchedCoordinator, customForm]);

  useEffect(() => {
    const option = getOptionByValue(OFFICIANT_OPTIONS, watchedOfficiant);
    if (customForm.getValues("officiantPrice") !== option.defaultPrice) {
      customForm.setValue("officiantPrice", option.defaultPrice, { shouldDirty: false });
    }
  }, [watchedOfficiant, customForm]);

  const foodOptionMeta: ServiceOption = getOptionByValue(FOOD_OPTIONS, watchedFoodStyle);
  const beverageOptionMeta: ServiceOption = getOptionByValue(BEVERAGE_OPTIONS, watchedBeverage);
  const cakeOptionMeta: ServiceOption = getOptionByValue(CAKE_OPTIONS, watchedCake);
  const floralOptionMeta: ServiceOption = getOptionByValue(FLORAL_OPTIONS, watchedFloral);
  const coordinatorOptionMeta: ServiceOption = getOptionByValue(COORDINATOR_OPTIONS, watchedCoordinator);
  const officiantOptionMeta: ServiceOption = getOptionByValue(OFFICIANT_OPTIONS, watchedOfficiant);
  const liveCustomValues = customForm.watch();

  const calendarDisabledDays = useCallback((date: Date) => {
    const normalized = startOfDay(date);
    if (isBefore(normalized, startOfToday())) return true;
    const status = getAvailabilityStatus(normalized);
    return status !== "available";
  }, []);

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
        deposit: STREAMLINED_DEPOSIT,
      },
      customEstimate: undefined,
    }));
    setStep("review");
  };

  const handleCustomSubmit = customForm.handleSubmit((values) => {
    const nextSelections = normalizeCustomSelections(values);

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
    const trimmed = text.trim();
    if (!trimmed) return;
    const clientMessage: Message = {
      id: generateMessageId("client"),
      sender: "Client",
      body: trimmed,
      timestamp: new Date(),
    };
    const autoMessage: Message = {
      id: generateMessageId("auto"),
      sender: "Tiny Diner",
      body: "Thanks! A coordinator will reply shortly and we&apos;ll log this thread inside HoneyBook as well.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, clientMessage, autoMessage]);
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

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveEstimate = async () => {
    setSaveError(null);
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    if (!booking.eventDate || !booking.planType) return;
    setSaving(true);
    try {
      const db = getFirestoreDb();
      if (!db) {
        throw new Error("Firestore not initialized (missing env vars?)");
      }
      const docRef = await addDoc(collection(db, "estimates"), {
        uid: user.uid,
        createdAt: serverTimestamp(),
        eventDate: booking.eventDate.toISOString(),
        planType: booking.planType,
        client: booking.client,
        estimate: booking.planType === "streamlined" ? booking.streamlinedSummary : booking.customEstimate,
        customSelections: booking.planType === "custom" ? booking.customSelections : null,
        messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
      });
      console.info("Saved estimate", docRef.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#f6f4f1] via-white to-[#f5fbff] text-slate-900 overflow-x-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-10 px-4 sm:px-6 pb-20 pt-8 lg:pt-10">
        <HeaderSection booking={booking} />
        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <StepIndicator currentStep={step} setStep={setStep} />
            <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} onAuthed={() => setAuthDialogOpen(false)} />
            
            {/* Guided Dialogs for each step */}
            <Dialog open={step === "calendar"} onOpenChange={() => { /* keep guided modal open */ }}>
              <DialogContent className="sm:max-w-2xl md:max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                    <CalendarDays className="h-6 w-6 text-rose-500" /> Availability
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Calendar
                    mode="single"
                    selected={booking.eventDate ?? undefined}
                    onSelect={handleDateSelect}
                    numberOfMonths={isMobile ? 1 : 2}
                    className="rounded-md border bg-white"
                    disabled={calendarDisabledDays}
                    modifiers={{ hold: HOLD_DATES, booked: BOOKED_DATES }}
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
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={step === "contact"} onOpenChange={() => {}}>
              <DialogContent className="sm:max-w-2xl md:max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-5 w-5 text-sky-500" /> Tell us about the couple
                  </DialogTitle>
                </DialogHeader>
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
              </DialogContent>
            </Dialog>

            <Dialog open={step === "plan"} onOpenChange={() => {}}>
              <DialogContent className="sm:max-w-2xl md:max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
                <DialogHeader>
                  <DialogTitle className="text-xl">Choose your path</DialogTitle>
                </DialogHeader>
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
                          ${STREAMLINED_DEPOSIT.toLocaleString()} deposit to reserve your date
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
                        Design your celebration with mix-and-match services. We&apos;ll prepare a bespoke estimate and coordinator brief.
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
              </DialogContent>
            </Dialog>

            <Dialog open={step === "custom"} onOpenChange={() => {}}>
              <DialogContent className="sm:max-w-2xl md:max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Customize your celebration</DialogTitle>
                </DialogHeader>
                <Form {...customForm}>
                  <form className="grid gap-6 lg:grid-cols-[1.35fr_1fr]" onSubmit={handleCustomSubmit}>
                    <div className="space-y-6">
                      <FormField
                        control={customForm.control}
                        name="guestCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guest count</FormLabel>
                            <Input type="number" min={10} max={120} {...field} />
                            <FormDescription>Defaults to our intimate gathering size of 35 guests.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <FormField
                            control={customForm.control}
                            name="foodStyle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dining style</FormLabel>
                                <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                  {FOOD_OPTIONS.map((option) => (
                                    <OptionCard
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                      subtitle={option.subtitle}
                                      hint={option.pricingType === "perGuest"
                                        ? `$${option.defaultPrice.toLocaleString()} per guest`
                                        : `$${option.defaultPrice.toLocaleString()} flat`}
                                    />
                                  ))}
                                </RadioGroup>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customForm.control}
                            name="foodPrice"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between gap-2">
                                  <FormLabel>
                                    {foodOptionMeta.pricingType === "perGuest" ? "Price per guest" : "Package price"}
                                  </FormLabel>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 text-xs"
                                    onClick={() => customForm.setValue("foodPrice", foodOptionMeta.defaultPrice, { shouldDirty: false })}
                                  >
                                    Reset to default
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  step={foodOptionMeta.pricingType === "perGuest" ? 1 : 10}
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const next = event.target.valueAsNumber;
                                    field.onChange(Number.isNaN(next) ? 0 : next);
                                  }}
                                />
                                <FormDescription>
                                  Default: ${foodOptionMeta.defaultPrice.toLocaleString()} {foodOptionMeta.pricingType === "perGuest" ? "per guest" : "flat"} with {foodOptionMeta.vendorOverride ?? FOOD_VENDOR}.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <FormField
                            control={customForm.control}
                            name="beverage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Beverage</FormLabel>
                                <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                  {BEVERAGE_OPTIONS.map((option) => (
                                    <OptionCard
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                      subtitle={option.subtitle}
                                      hint={option.pricingType === "perGuest"
                                        ? `$${option.defaultPrice.toLocaleString()} per guest`
                                        : `$${option.defaultPrice.toLocaleString()} flat`}
                                    />
                                  ))}
                                </RadioGroup>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customForm.control}
                            name="beveragePrice"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between gap-2">
                                  <FormLabel>
                                    {beverageOptionMeta.pricingType === "perGuest" ? "Price per guest" : "Service fee"}
                                  </FormLabel>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 text-xs"
                                    onClick={() => customForm.setValue("beveragePrice", beverageOptionMeta.defaultPrice, { shouldDirty: false })}
                                  >
                                    Reset to default
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  step={beverageOptionMeta.pricingType === "perGuest" ? 1 : 10}
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const next = event.target.valueAsNumber;
                                    field.onChange(Number.isNaN(next) ? 0 : next);
                                  }}
                                />
                                <FormDescription>
                                  Default: ${beverageOptionMeta.defaultPrice.toLocaleString()} {beverageOptionMeta.pricingType === "perGuest" ? "per guest" : "flat"} with {beverageOptionMeta.vendorOverride ?? BEVERAGE_VENDOR}.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <FormField
                            control={customForm.control}
                            name="cake"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cake or dessert</FormLabel>
                                <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                  {CAKE_OPTIONS.map((option) => (
                                    <OptionCard
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                      subtitle={option.subtitle}
                                      hint={`$${option.defaultPrice.toLocaleString()} ${option.pricingType === "perGuest" ? "per guest" : "flat"}`}
                                    />
                                  ))}
                                </RadioGroup>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customForm.control}
                            name="cakePrice"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between gap-2">
                                  <FormLabel>Package price</FormLabel>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 text-xs"
                                    onClick={() => customForm.setValue("cakePrice", cakeOptionMeta.defaultPrice, { shouldDirty: false })}
                                  >
                                    Reset to default
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  step={10}
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const next = event.target.valueAsNumber;
                                    field.onChange(Number.isNaN(next) ? 0 : next);
                                  }}
                                />
                                <FormDescription>
                                  Default: ${cakeOptionMeta.defaultPrice.toLocaleString()} flat with {cakeOptionMeta.vendorOverride ?? CAKE_VENDOR}.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <FormField
                            control={customForm.control}
                            name="floral"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Floral & decor</FormLabel>
                                <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                  {FLORAL_OPTIONS.map((option) => (
                                    <OptionCard
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                      subtitle={option.subtitle}
                                      hint={`$${option.defaultPrice.toLocaleString()} ${option.pricingType === "perGuest" ? "per guest" : "flat"}`}
                                    />
                                  ))}
                                </RadioGroup>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customForm.control}
                            name="floralPrice"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between gap-2">
                                  <FormLabel>Package price</FormLabel>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 text-xs"
                                    onClick={() => customForm.setValue("floralPrice", floralOptionMeta.defaultPrice, { shouldDirty: false })}
                                  >
                                    Reset to default
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  step={10}
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const next = event.target.valueAsNumber;
                                    field.onChange(Number.isNaN(next) ? 0 : next);
                                  }}
                                />
                                <FormDescription>
                                  Default: ${floralOptionMeta.defaultPrice.toLocaleString()} flat with {floralOptionMeta.vendorOverride ?? FLORAL_VENDOR}.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <FormField
                            control={customForm.control}
                            name="coordinator"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Coordination support</FormLabel>
                                <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                  {COORDINATOR_OPTIONS.map((option) => (
                                    <OptionCard
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                      subtitle={option.subtitle}
                                      hint={`$${option.defaultPrice.toLocaleString()} ${option.pricingType === "perGuest" ? "per guest" : "flat"}`}
                                    />
                                  ))}
                                </RadioGroup>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customForm.control}
                            name="coordinatorPrice"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between gap-2">
                                  <FormLabel>Package price</FormLabel>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 text-xs"
                                    onClick={() => customForm.setValue("coordinatorPrice", coordinatorOptionMeta.defaultPrice, { shouldDirty: false })}
                                  >
                                    Reset to default
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  step={10}
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const next = event.target.valueAsNumber;
                                    field.onChange(Number.isNaN(next) ? 0 : next);
                                  }}
                                />
                                <FormDescription>
                                  Default: ${coordinatorOptionMeta.defaultPrice.toLocaleString()} flat with {coordinatorOptionMeta.vendorOverride ?? COORDINATOR_VENDOR}.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <FormField
                            control={customForm.control}
                            name="officiant"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Officiant</FormLabel>
                                <RadioGroup className="grid gap-3" onValueChange={field.onChange} value={field.value}>
                                  {OFFICIANT_OPTIONS.map((option) => (
                                    <OptionCard
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                      subtitle={option.subtitle}
                                      hint={`$${option.defaultPrice.toLocaleString()} ${option.pricingType === "perGuest" ? "per guest" : "flat"}`}
                                    />
                                  ))}
                                </RadioGroup>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customForm.control}
                            name="officiantPrice"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between gap-2">
                                  <FormLabel>Package price</FormLabel>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 text-xs"
                                    onClick={() => customForm.setValue("officiantPrice", officiantOptionMeta.defaultPrice, { shouldDirty: false })}
                                  >
                                    Reset to default
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  step={10}
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const next = event.target.valueAsNumber;
                                    field.onChange(Number.isNaN(next) ? 0 : next);
                                  }}
                                />
                                <FormDescription>
                                  Default: ${officiantOptionMeta.defaultPrice.toLocaleString()} flat with {officiantOptionMeta.vendorOverride ?? OFFICIANT_VENDOR}.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
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

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep("plan")}>Back</Button>
                        <Button type="submit" className="sm:min-w-[10rem]">Review estimate</Button>
                      </div>
                    </div>

                    <div className="space-y-4 lg:sticky lg:top-6">
                      <CustomPlanCalculator values={liveCustomValues} />
                      <p className="text-xs text-slate-500">
                        Adjust any package pricing to see the live vendor breakdown update instantly.
                      </p>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={step === "review" && !!booking.eventDate} onOpenChange={() => {}}>
              <DialogContent className="sm:max-w-2xl md:max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
                <DialogHeader>
                  <DialogTitle className="text-xl">Review & dashboard</DialogTitle>
                </DialogHeader>
                {booking.eventDate && (
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
                    onSaveEstimate={handleSaveEstimate}
                    saving={saving}
                    saveSuccess={saveSuccess}
                    saveError={saveError}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Welcome Intro Dialog */}
            <Dialog open={step === "welcome"} onOpenChange={() => {}}>
              <DialogContent className="sm:max-w-2xl md:max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white font-semibold">1</span>
                    Welcome to Tiny Diner Weddings
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 text-sm text-slate-600">
                  <p>
                    This demo pre-fills example couple details so you can jump directly into the booking flow. Start by reviewing availability, then confirm your info, select a signature or custom path, and generate a live estimate.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Real-time date selection (demo data)</li>
                    <li>Pre-filled client intake form (editable)</li>
                    <li>Streamlined vs. custom plan comparison</li>
                    <li>Automatic estimate + deposit breakdown</li>
                  </ul>
                  <div className="pt-2 flex justify-end">
                    <Button onClick={() => setStep("calendar")} className="bg-rose-600 hover:bg-rose-700 text-white">Get Started</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            <Logo priority className="h-auto w-full object-contain" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Tiny Diner</p>
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
              Wedding Onboarding & Booking Portal
            </h1>
            <p className="mt-1 text-sm text-slate-500">{(booking.eventDate ? format(booking.eventDate, "MMM d, yyyy") : "No date selected")}</p>
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

function StepIndicator({ currentStep, setStep }: { currentStep: Step; setStep: (s: Step) => void }) {
  const steps: { id: Step; label: string; description?: string }[] = [
    { id: "welcome", label: "Welcome", description: "Overview & demo" },
    { id: "calendar", label: "Select date", description: "Pick your wedding date" },
    { id: "contact", label: "Client info", description: "Tell us about the couple" },
    { id: "plan", label: "Choose path", description: "Pick a package or build custom" },
    { id: "custom", label: "Customize", description: "Customize food, drinks & extras" },
    { id: "review", label: "Dashboard", description: "Review, sync, and pay deposit" },
  ];

  const activeIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex gap-6">
      {/* Mobile top strip */}
      <div className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white/70 px-3 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
            {activeIndex + 1}
          </span>
          <span className="text-sm font-medium text-slate-800">{steps[activeIndex]?.label}</span>
        </div>
        <span className="text-xs text-slate-500">{activeIndex + 1} / {steps.length}</span>
      </div>

      {/* Desktop vertical progress */}
      <ol className="hidden w-56 flex-col gap-3 md:flex">
        {steps.map((s, i) => {
          const isActive = i === activeIndex;
          const isComplete = i < activeIndex;
          return (
            <li key={s.id} className={cn("flex items-start gap-3 rounded p-3", isActive ? "bg-rose-50 border border-rose-100" : isComplete ? "bg-emerald-50 border border-emerald-100" : "bg-white/0 border border-transparent")}>
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold", isComplete ? "bg-emerald-500 text-white" : isActive ? "bg-rose-500 text-white" : "border border-slate-200 text-slate-600")}>{isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</div>
              <div className="min-w-0">
                <div className={cn("text-sm font-semibold", isActive ? "text-rose-600" : isComplete ? "text-emerald-700" : "text-slate-700")}>
                  {s.label}
                </div>
                <div className="text-xs text-slate-500 truncate">{s.description}</div>
                <div className="mt-2">
                  <Button size="sm" variant={isActive ? "default" : "ghost"} onClick={() => setStep(s.id)}>{isActive ? "Current" : "Go"}</Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
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
  hint,
}: {
  value: string;
  title: string;
  subtitle: string;
  hint?: string;
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
          {hint && <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-rose-500">{hint}</p>}
        </div>
        <RadioGroupItem value={value} id={value} className="border-rose-500 text-rose-500" />
      </div>
    </Label>
  );
}
function normalizeCustomSelections(values: Partial<CustomSelections>): CustomSelections {
  const guestCount = typeof values.guestCount === "number" && Number.isFinite(values.guestCount)
    ? Math.max(10, Math.min(120, Math.round(values.guestCount)))
    : initialCustomSelections.guestCount;

  const foodStyle = values.foodStyle ?? initialCustomSelections.foodStyle;
  const beverage = values.beverage ?? initialCustomSelections.beverage;
  const cake = values.cake ?? initialCustomSelections.cake;
  const floral = values.floral ?? initialCustomSelections.floral;
  const coordinator = values.coordinator ?? initialCustomSelections.coordinator;
  const officiant = values.officiant ?? initialCustomSelections.officiant;

  const ensureAmount = (
    amount: unknown,
    options: readonly ServiceOption[],
    value: string,
  ) => {
    if (typeof amount !== "number" || Number.isNaN(amount)) {
      return getOptionByValue(options, value).defaultPrice;
    }
    return Math.max(0, amount);
  };

  return {
    guestCount,
    foodStyle,
    beverage,
    cake,
    floral,
    coordinator,
    officiant,
    foodPrice: ensureAmount(values.foodPrice, FOOD_OPTIONS, foodStyle),
    beveragePrice: ensureAmount(values.beveragePrice, BEVERAGE_OPTIONS, beverage),
    cakePrice: ensureAmount(values.cakePrice, CAKE_OPTIONS, cake),
    floralPrice: ensureAmount(values.floralPrice, FLORAL_OPTIONS, floral),
    coordinatorPrice: ensureAmount(values.coordinatorPrice, COORDINATOR_OPTIONS, coordinator),
    officiantPrice: ensureAmount(values.officiantPrice, OFFICIANT_OPTIONS, officiant),
    notes: typeof values.notes === "string" ? values.notes : "",
  };
}

function CustomPlanCalculator({ values }: { values: Partial<CustomSelections> }) {
  const selections = normalizeCustomSelections(values);
  const estimate = buildCustomEstimate(selections);

  return (
    <Card className="border border-slate-200 bg-white/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800">Estimate calculator</CardTitle>
        <CardDescription>Vendor-by-vendor breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Guest count</span>
          <span className="font-medium text-slate-900">{selections.guestCount}</span>
        </div>
        <Separator />
        <div className="space-y-3">
          {estimate.lineItems.map((item) => (
            <div
              key={`${item.vendor ?? item.label}-${item.label}`}
              className="flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.vendor ?? item.label}</p>
                {item.vendor && <p className="text-xs text-slate-500">{item.label}</p>}
              </div>
              <p className="text-sm font-semibold text-slate-900">${item.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>${estimate.total.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Deposit (25%)</span>
            <span>${estimate.deposit.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
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
  onSaveEstimate,
  saving,
  saveSuccess,
  saveError,
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
  onSaveEstimate: () => void;
  saving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
}) {
  const [draftMessage, setDraftMessage] = useState("");

  const summaryItems: { label: string; amount?: number }[] =
    booking.planType === "streamlined"
      ? STREAMLINED_PACKAGE.inclusions.map((item) => ({ label: item }))
      : booking.customEstimate?.lineItems.map((item) => ({
          label: item.vendor ? `${item.vendor} · ${item.label}` : item.label,
          amount: item.amount,
        })) ?? [];

  return (
    <Card className="border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/70 relative pb-24 md:pb-6">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <CalendarDays className="h-4 w-4 text-rose-500" />
              {format(booking.eventDate!, "MMM d, yyyy")} · Tiny Diner
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
          <TabsList className="w-full grid grid-cols-4 md:grid-cols-4 overflow-x-auto scrollbar-none gap-0 [--tw-border-opacity:1]">
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
                        : booking.customSelections.foodStyle === "notRequired"
                          ? `${booking.customSelections.guestCount} guests · outside catering`
                          : `${booking.customSelections.guestCount} guests · ${readableFood(booking.customSelections.foodStyle)} dining`}
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
                  <p className="text-xs text-rose-500">ACH encouraged • Card adds 3% processing</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Status</p>
                  <StatusPill status={booking.paymentStatus} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={onSaveEstimate}
                  disabled={saving}
                >
                  {saving ? "Saving..." : saveSuccess ? "Saved" : "Save estimate"}
                </Button>
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
              {saveError && (
                <p className="px-6 pb-4 text-xs text-rose-600">{saveError}</p>
              )}
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
                      ? "Synced! We&apos;ll keep this dashboard in lockstep with your HoneyBook project."
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
                  Notes stay in sync for you, your partner, and your coordinator. We&apos;ll push everything to HoneyBook too.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-lg border border-slate-200 bg-white/90 p-3 text-sm shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{message.sender}</span>
                        <span>{format(message.timestamp, "MMM d · h:mm a")}</span>
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
      {/* Mobile floating action bar */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 px-4 py-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onSaveEstimate} disabled={saving}>
          {saving ? 'Saving' : saveSuccess ? 'Saved' : 'Save'}
        </Button>
        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onStartPayment('ach')} disabled={processingPayment}>
          Pay deposit
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={onSyncHoneybook} disabled={syncing}>
          {syncing ? 'Sync…' : 'Sync'}
        </Button>
      </div>
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
      <CardContent>
        {/* Desktop grid */}
        <div className="hidden gap-4 md:grid md:grid-cols-2">
          {section.vendors.map((vendor) => (
            <VendorCard key={vendor.name} vendor={vendor} />
          ))}
        </div>
        {/* Mobile accordion */}
        <div className="md:hidden">
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {section.vendors.map((vendor) => (
              <details key={vendor.name} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 group-open:bg-rose-50">
                  <span>{vendor.name}</span>
                  <span className="text-xs text-slate-500">{vendor.cost}</span>
                </summary>
                <div className="space-y-2 bg-white/70 p-4 text-xs text-slate-600">
                  <p className="text-slate-500">{vendor.notes}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <span>Email:</span><span className="truncate">{vendor.contact}</span>
                    <span>Phone:</span><span>{vendor.phone}</span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full">Message vendor</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Message {vendor.name}</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-slate-600">
                        Compose a note to {vendor.name}. We&apos;ll relay through HoneyBook while keeping this thread updated.
                      </p>
                      <Textarea rows={5} placeholder={`Write a message to ${vendor.name}`} />
                      <Button>Send via Tiny Diner concierge</Button>
                    </DialogContent>
                  </Dialog>
                </div>
              </details>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VendorCard({ vendor }: { vendor: (typeof PREFERRED_VENDORS)[number]["vendors"][number] }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200/80 bg-white/80 p-4 shadow-sm">
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
              Compose a note to {vendor.name}. We&apos;ll relay through HoneyBook while keeping this thread updated.
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
    case "notRequired":
      return "outside catering";
    default:
      return style;
  }
}
function buildCustomEstimate(selections: CustomSelections) {
  const guestCount = Math.max(10, Math.round(selections.guestCount));
  const lineItems: EstimateLineItem[] = [];

  lineItems.push({
    vendor: VENUE_VENDOR,
    label: "Venue reservation & staffing",
    amount: VENUE_BASE_RATE,
  });

  const addServiceLine = (
    options: readonly ServiceOption[],
    vendorDefault: string,
    value: string,
    price: number,
  ) => {
    const option = getOptionByValue(options, value);
    const sanitizedPrice = Math.max(0, price);
    const amount = Math.round(
      option.pricingType === "perGuest" ? sanitizedPrice * guestCount : sanitizedPrice,
    );
    lineItems.push({
      vendor: option.vendorOverride ?? vendorDefault,
      label:
        option.pricingType === "perGuest"
          ? `${option.title} (${guestCount} guests)`
          : option.title,
      amount,
    });
  };

  addServiceLine(FOOD_OPTIONS, FOOD_VENDOR, selections.foodStyle, selections.foodPrice);
  addServiceLine(BEVERAGE_OPTIONS, BEVERAGE_VENDOR, selections.beverage, selections.beveragePrice);
  addServiceLine(CAKE_OPTIONS, CAKE_VENDOR, selections.cake, selections.cakePrice);
  addServiceLine(FLORAL_OPTIONS, FLORAL_VENDOR, selections.floral, selections.floralPrice);
  addServiceLine(COORDINATOR_OPTIONS, COORDINATOR_VENDOR, selections.coordinator, selections.coordinatorPrice);
  addServiceLine(OFFICIANT_OPTIONS, OFFICIANT_VENDOR, selections.officiant, selections.officiantPrice);

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const deposit = Math.round(total * 0.25);

  return {
    lineItems,
    total,
    deposit,
  };
}

function isoDateStringToMidnightDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function generateMessageId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

// buildAvailabilityMap removed — not needed in the current flow


















