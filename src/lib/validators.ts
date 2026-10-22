import { z } from "zod";
import { COLLEGE_STAGES, DEAL_STAGES, FEST_TYPES, ROLES, TRAVEL } from "./stages";

const money = z.coerce.number().int().min(0).max(100_000_000_000);
const text = (max = 2000) => z.string().trim().max(max);
const phone = z.string().trim().max(30);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2027-02-14");
const optDate = z.union([isoDate, z.literal(""), z.null()]).optional().transform((v) => (v ? v : null));
const month = z.coerce.number().int().min(0).max(11);
const optMonth = z.union([month, z.literal(""), z.null()]).optional().transform((v) => (v === "" || v === undefined ? null : v));

export const loginSchema = z.object({ username: text(60).min(1), password: z.string().min(1).max(200) });

export const userCreate = z.object({
  name: text(80).min(1),
  username: text(40).min(3).regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dot, dash and underscore only"),
  password: z.string().min(8, "At least 8 characters").max(200),
  role: z.enum(ROLES),
});
export const userUpdate = z.object({
  name: text(80).min(1).optional(),
  username: text(40).min(3).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  password: z.string().min(8, "At least 8 characters").max(200).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export const collegeFields = z.object({
  name: text(160).min(1),
  city: text(80).min(1),
  state: text(60),
  festName: text(120),
  festType: z.enum(FEST_TYPES),
  festMonth: month,
  festYear: z.coerce.number().int().min(2000).max(2100),
  festStart: optDate,
  festEnd: optDate,
  days: z.coerce.number().int().min(1).max(7),
  convenorName: text(120),
  convenorPhone: phone,
  facultyName: text(120),
  facultyPhone: phone,
  artistBudget: money,
  prodBudget: money,
  wishlist: text(1000),
  scopeNotes: text(2000),
  proposedArtistRate: money,
  proposedProdRate: money,
  proposalNotes: text(2000),
  dealAmount: money,
  dealDeliverables: text(2000),
  pitchCompany: text(120),
});
export const collegeUpdate = collegeFields.partial();
export const collegeCreate = z.object({
  name: text(160).min(1),
  city: text(80).min(1),
  state: text(60).default(""),
  festName: text(120).default(""),
  festType: z.enum(FEST_TYPES).default("cultural"),
  festMonth: optMonth,
  festYear: z.coerce.number().int().min(2000).max(2100).optional(),
  festStart: optDate,
  festEnd: optDate,
  days: z.coerce.number().int().min(1).max(7).default(2),
});

export const stageMove = z.object({
  to: z.enum(COLLEGE_STAGES),
  reason: text(200).optional(),
  fields: collegeUpdate.omit({ name: true, city: true }).optional(),
});
export const dealMove = z.object({
  to: z.enum(DEAL_STAGES),
  reason: text(200).optional(),
  fields: z
    .object({ amount: money, deliverables: text(2000), contactName: text(120), contactPhone: phone, notes: text(2000) })
    .partial()
    .optional(),
});

export const assignSchema = z.object({ userIds: z.array(z.number().int()).max(50), pitchCompany: text(120).optional() });
export const noteSchema = z.object({ text: text(2000).min(1) });

const travel = z.enum(TRAVEL).default("unknown");
export const historySchema = z.discriminatedUnion("section", [
  z.object({
    section: z.literal("year"),
    id: z.number().int().optional(),
    data: z.object({
      year: z.coerce.number().int().min(2000).max(2100),
      agency: text(120).default(""),
      eventMonth: optMonth,
      startDate: optDate,
      endDate: optDate,
      days: z.coerce.number().int().min(1).max(7).default(2),
    }),
  }),
  z.object({
    section: z.literal("sponsor"),
    id: z.number().int().optional(),
    data: z.object({
      brand: text(120).min(1),
      year: z.coerce.number().int().min(2000).max(2100),
      title: text(80).default(""),
      amount: money.default(0),
      deliverables: text(1000).default(""),
      exclusive: z.boolean().default(false),
      eventMonth: optMonth,
      eventDate: optDate,
      notes: text(1000).default(""),
    }),
  }),
  z.object({
    section: z.literal("artist"),
    id: z.number().int().optional(),
    data: z.object({
      year: z.coerce.number().int().min(2000).max(2100),
      kind: z.enum(["item", "total"]).default("item"),
      artistId: z.number().int().nullable().optional(),
      artistName: text(120).default(""),
      genre: text(40).default(""),
      day: z.coerce.number().int().min(0).max(7).default(0),
      amount: money.default(0),
      travel,
      travelExtra: money.default(0),
      notes: text(1000).default(""),
    }),
  }),
  z.object({
    section: z.literal("production"),
    id: z.number().int().optional(),
    data: z.object({
      year: z.coerce.number().int().min(2000).max(2100),
      kind: z.enum(["item", "total"]).default("item"),
      vendor: text(120).default(""),
      scope: text(120).default(""),
      day: z.coerce.number().int().min(0).max(7).default(0),
      amount: money.default(0),
      travel,
      travelExtra: money.default(0),
      notes: text(1000).default(""),
    }),
  }),
]);

const contact = z.object({ name: text(120).default(""), designation: text(80).default(""), phone: phone.default("") });

export const companyCreate = z.object({
  name: text(120).min(1),
  category: text(80).default(""),
  notes: text(2000).default(""),
  contacts: z.array(contact).max(20).default([]),
});
export const companyUpdate = companyCreate.partial();

export const dealCreate = z.object({
  companyId: z.number().int(),
  collegeId: z.number().int().nullable().default(null),
  year: z.coerce.number().int().min(2000).max(2100).nullable().default(null),
  stage: z.enum(DEAL_STAGES).default("reach_out"),
  amount: money.default(0),
  deliverables: text(2000).default(""),
  contactName: text(120).default(""),
  contactPhone: phone.default(""),
  exclusive: z.boolean().default(false),
  notes: text(2000).default(""),
});
export const dealUpdate = z.object({
  collegeId: z.number().int().nullable().optional(),
  year: z.coerce.number().int().min(2000).max(2100).nullable().optional(),
  amount: money.optional(),
  deliverables: text(2000).optional(),
  contactName: text(120).optional(),
  contactPhone: phone.optional(),
  exclusive: z.boolean().optional(),
  notes: text(2000).optional(),
});

const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(v), "Enter a full web address starting with https://");
export const artistCreate = z.object({
  name: text(120).min(1),
  stageName: text(120).default(""),
  genre: text(40).default(""),
  lastRate: money.default(0),
  crewCount: z.coerce.number().int().min(0).max(500).default(0),
  riderNotes: text(4000).default(""),
  techRiderUrl: url.default(""),
  hospitalityRiderUrl: url.default(""),
  contacts: z.array(contact).max(20).default([]),
});
export const artistUpdate = artistCreate.partial();
export const showSchema = z.object({
  id: z.number().int().optional(),
  collegeName: text(160).min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  eventMonth: optMonth,
  eventDate: optDate,
  amount: money.default(0),
  travel,
  travelExtra: money.default(0),
  notes: text(1000).default(""),
});

export const pushSub = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(300), auth: z.string().max(300) }),
});
