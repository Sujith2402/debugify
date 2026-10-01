export interface StoredParticipant {
  id: string;
  participant_code: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  shortlisted?: boolean;
}

// In-memory registry that seeds User 1 to User 5 so coordinators can assign them immediately
export const DEFAULT_PARTICIPANTS: StoredParticipant[] = [
  {
    id: "ffaf57cc-298f-4be6-b541-92c00a1bde79",
    participant_code: "DBG2026001",
    full_name: "User 1 (John Doe)",
    email: "dbg2026001@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "11111111-1111-4111-a111-111111111111",
    participant_code: "DBG2026002",
    full_name: "User 2",
    email: "dbg2026002@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "22222222-2222-4222-a222-222222222222",
    participant_code: "DBG2026003",
    full_name: "User 3",
    email: "dbg2026003@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "33333333-3333-4333-a333-333333333333",
    participant_code: "DBG2026004",
    full_name: "User 4",
    email: "dbg2026004@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "44444444-4444-4444-a444-444444444444",
    participant_code: "DBG2026005",
    full_name: "User 5",
    email: "dbg2026005@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
];

let _customParticipants: StoredParticipant[] = [];

export function getRegisteredParticipants(): StoredParticipant[] {
  return [...DEFAULT_PARTICIPANTS, ..._customParticipants];
}

export function registerCustomParticipant(p: StoredParticipant) {
  _customParticipants.push(p);
}

export function findParticipantById(id: string): StoredParticipant | undefined {
  return getRegisteredParticipants().find((p) => p.id === id);
}

export function findParticipantByCode(code: string): StoredParticipant | undefined {
  return getRegisteredParticipants().find((p) => p.participant_code.toLowerCase() === code.toLowerCase());
}
