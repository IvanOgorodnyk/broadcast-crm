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
