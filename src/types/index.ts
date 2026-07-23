import type {
  AssignmentRole,
  EventStatus,
  MatchFormat,
  SetupType,
  ParticipantType,
  SystemRole,
} from "@prisma/client";

/** The signed-in user as seen by calendar components. */
export type Viewer = {
  id: string;
  role: SystemRole;
  positions: AssignmentRole[];
};

export type MetaUser = {
  id: string;
  username: string;
  name?: string | null;
  surname?: string | null;
  avatarUrl?: string | null;
};

export type Meta = {
  eventTitles: string[];
  disciplines: { id: string; name: string; color: string }[];
  studios: { id: string; name: string; isAnalystStudio?: boolean }[];
  channels: { id: string; name: string }[];
  discordChannels: { id: string; name: string }[];
  streamChannels: { id: string; name: string }[];
  users: MetaUser[];
  participants: {
    main: { id: string; name: string; type: ParticipantType }[];
    media: { id: string; name: string; type: ParticipantType }[];
  };
};

export type EventAssignment = {
  id: string;
  role: AssignmentRole;
  user: MetaUser;
  lateSubstitute?: boolean;
  payAdjustment?: number | null;
  payNote?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  segment: string | null;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  setupType: SetupType;
  matchFormat: MatchFormat | null;
  mapsPlayed: number | null;
  countryTag: string | null;
  streamLinks: string | null;
  cleanFeedYoutube: string | null;
  cleanFeedRtmp: string | null;
  graphicsUrl: string | null;
  notes: string | null;
  internalComment: string | null;
  color: string;
  discipline: { id: string; name: string; color: string; logoUrl?: string | null };
  studio: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  discordChannel: { id: string; name: string } | null;
  streamChannels: { id: string; name: string }[];
  createdBy: { id: string; username: string };
  assignments: EventAssignment[];
  participants: { id: string; name: string; type: ParticipantType }[];
};

export type CalendarView = "day" | "week" | "month";

// ---------------------------------------------------------------------------
// Work tracking (stats)
// ---------------------------------------------------------------------------

/** Tracked role buckets, matching the calendar columns. */
export type WorkBucket = "CASTER" | "ANALYST" | "DIRECTOR" | "SMM";

export type WorkGame = {
  id: string;
  startsAt: string;
  title: string;
  disciplineName: string;
  disciplineColor: string;
  teams: string[];
  matchFormat: MatchFormat | null;
  /** Buckets this person held on the game (usually one). */
  buckets: WorkBucket[];
};

export type WorkTournament = {
  title: string;
  disciplineName: string;
  disciplineColor: string;
  games: number; // distinct games this person worked in the tournament
  byBucket: Record<WorkBucket, number>;
  lastAt: string; // most recent game start, for sorting
  games_list: WorkGame[];
};

export type WorkPerson = {
  user: MetaUser;
  totalGames: number; // distinct games worked overall
  byBucket: Record<WorkBucket, number>;
  tournaments: WorkTournament[];
};

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

/** One paid role on one game (a person can hold several on the same game). */
export type PayLine = {
  eventId: string;
  startsAt: string;
  title: string;
  disciplineName: string;
  disciplineColor: string;
  teams: string[];
  matchFormat: MatchFormat | null;
  maps: number;
  role: AssignmentRole;
  base: number;
  workload: number;
  substitution: number;
  adjustment: number;
  note: string | null;
  total: number;
};

export type PayTournament = {
  title: string;
  disciplineName: string;
  disciplineColor: string;
  maps: number;
  total: number;
  lastAt: string;
  lines: PayLine[];
};

export type PayPerson = {
  user: MetaUser;
  total: number;
  maps: number;
  totals: { base: number; workload: number; substitution: number; adjustment: number };
  tournaments: PayTournament[];
};
