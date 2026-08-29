import { db } from "@/lib/db";

export type MatchCandidate = {
  profileId: string;
  attendeeId: string;
  headline: string | null;
  industry: string | null;
  role: string | null;
  interests: string[];
  score: number;
  reasons: string[];
};

function overlapScore(a: string[], b: string[]): { score: number; matched: string[] } {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const matched = a.filter((x) => setB.has(x.toLowerCase()));
  return { score: matched.length * 10, matched };
}

/** Rule-based match score — overlap on interests, goals, industry, role, sessions. No ML. */
export async function getMatchSuggestions(
  eventId: string,
  attendeeId: string,
  limit = 20,
): Promise<MatchCandidate[]> {
  const myProfile = await db.networkingProfile.findUnique({
    where: { attendeeId },
  });
  if (!myProfile || !myProfile.visible) return [];

  const myAttendee = await db.attendee.findUnique({
    where: { id: attendeeId },
    select: { jobTitle: true, company: true, category: true },
  });

  const mySessionIds = (
    await db.sessionSave.findMany({
      where: { attendeeId },
      select: { sessionId: true },
    })
  ).map((s) => s.sessionId);

  const connectedIds = new Set<string>([attendeeId]);
  const connections = await db.connectionRequest.findMany({
    where: {
      eventId,
      OR: [{ fromAttendeeId: attendeeId }, { toAttendeeId: attendeeId }],
      status: { in: ["pending", "accepted"] },
    },
  });
  for (const c of connections) {
    connectedIds.add(c.fromAttendeeId);
    connectedIds.add(c.toAttendeeId);
  }

  const profiles = await db.networkingProfile.findMany({
    where: { eventId, visible: true, attendeeId: { notIn: [...connectedIds] } },
    take: 200,
  });

  const otherSessionMap = new Map<string, string[]>();
  if (mySessionIds.length > 0) {
    const saves = await db.sessionSave.findMany({
      where: { sessionId: { in: mySessionIds } },
      select: { attendeeId: true, sessionId: true },
    });
    for (const s of saves) {
      const list = otherSessionMap.get(s.attendeeId) ?? [];
      list.push(s.sessionId);
      otherSessionMap.set(s.attendeeId, list);
    }
  }

  const candidates: MatchCandidate[] = [];

  for (const p of profiles) {
    const reasons: string[] = [];
    let score = 0;

    const interestMatch = overlapScore(myProfile.interests, p.interests);
    score += interestMatch.score;
    if (interestMatch.matched.length) {
      reasons.push(`Shared interests: ${interestMatch.matched.slice(0, 3).join(", ")}`);
    }

    const goalMatch = overlapScore(myProfile.goals, p.goals);
    score += goalMatch.score;
    if (goalMatch.matched.length) {
      reasons.push(`Shared goals: ${goalMatch.matched.slice(0, 2).join(", ")}`);
    }

    if (myProfile.industry && p.industry && myProfile.industry.toLowerCase() === p.industry.toLowerCase()) {
      score += 15;
      reasons.push(`Same industry: ${p.industry}`);
    }

    if (myProfile.role && p.role && myProfile.role.toLowerCase() === p.role.toLowerCase()) {
      score += 8;
      reasons.push(`Same role: ${p.role}`);
    }

    if (myAttendee?.jobTitle && p.role && myAttendee.jobTitle.toLowerCase().includes(p.role.toLowerCase())) {
      score += 5;
    }

    const sharedSessions = otherSessionMap.get(p.attendeeId)?.length ?? 0;
    if (sharedSessions > 0) {
      score += sharedSessions * 12;
      reasons.push(`${sharedSessions} shared session${sharedSessions > 1 ? "s" : ""}`);
    }

    if (score > 0) {
      candidates.push({
        profileId: p.id,
        attendeeId: p.attendeeId,
        headline: p.headline,
        industry: p.industry,
        role: p.role,
        interests: p.interests,
        score,
        reasons,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}
