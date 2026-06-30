import type { AssignmentRole, EventStatus, SetupType, ParticipantType } from "@prisma/client";

export type MetaUser = {
  id: string;
  username: string;
  name?: string | null;
  surname?: string | null;
  avatarUrl?: string | null;
};

export type Meta = {
  disciplines: { id: string; name: string; color: string }[];
  studios: { id: string; name: string; isAnalystStudio?: boolean }[];
  channels: { id: string; name: string }[];
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
  countryTag: string | null;
  streamLinks: string | null;
  notes: string | null;
  internalComment: string | null;
  color: string;
  discipline: { id: string; name: string; color: string };
  studio: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  createdBy: { id: string; username: string };
  assignments: EventAssignment[];
  participants: { id: string; name: string; type: ParticipantType }[];
};

export type CalendarView = "day" | "week" | "month";
