export interface StoredParticipant {
  id: string;
  participant_code: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  shortlisted?: boolean;
}

// 30 Participants generated for Debugify events
export const DEFAULT_PARTICIPANTS: StoredParticipant[] = [
  {
    id: "3bb34ea3-a432-4e25-82a9-11d15118acb2",
    participant_code: "player1",
    full_name: "Player 1",
    email: "player1@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "55760389-a88f-46c0-8dd1-9b8fb8c0e074",
    participant_code: "player2",
    full_name: "Player 2",
    email: "player2@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "fcb55b70-eaf4-4bdf-9462-599d7febc0ef",
    participant_code: "player3",
    full_name: "Player 3",
    email: "player3@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "b69b8b06-0109-412b-a178-2d59df5785fa",
    participant_code: "player4",
    full_name: "Player 4",
    email: "player4@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "4eb3cd44-f8fa-4048-ad8f-599ff5d341b6",
    participant_code: "player5",
    full_name: "Player 5",
    email: "player5@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "0a1084fe-c546-495a-a342-5d7bbe3bf5d0",
    participant_code: "player6",
    full_name: "Player 6",
    email: "player6@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "a6bb0518-2b4b-4811-afdf-4efb2bee6fe4",
    participant_code: "player7",
    full_name: "Player 7",
    email: "player7@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "c3e8f7f7-26aa-44c9-84d2-86516bd01cb8",
    participant_code: "player8",
    full_name: "Player 8",
    email: "player8@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "1ea190d5-537c-4931-a67a-45b79edeb84a",
    participant_code: "player9",
    full_name: "Player 9",
    email: "player9@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "9120e6ce-d156-4fec-9513-29307f038925",
    participant_code: "player10",
    full_name: "Player 10",
    email: "player10@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "cf6a9bd0-e840-46c3-8ae0-227200113099",
    participant_code: "player11",
    full_name: "Player 11",
    email: "player11@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "88427ccd-0e85-42aa-a471-f3e83f591d40",
    participant_code: "player12",
    full_name: "Player 12",
    email: "player12@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
  },
  {
    id: "da7460e2-351c-4611-a393-a8b60f9b792a",
    participant_code: "player13",
    full_name: "Player 13",
    email: "player13@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "cf2f2083-5bb7-4281-8df7-4226167294cb",
    participant_code: "player14",
    full_name: "Player 14",
    email: "player14@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "174de96d-9928-4155-a90d-fea7a1d68224",
    participant_code: "player15",
    full_name: "Player 15",
    email: "player15@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "573b9949-2025-45da-af25-4ce709320be9",
    participant_code: "player16",
    full_name: "Player 16",
    email: "player16@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "c28e7478-1e08-4421-ab61-761c02667194",
    participant_code: "player17",
    full_name: "Player 17",
    email: "player17@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "dd3d283d-9143-4ab4-a87d-7b52874bb6f8",
    participant_code: "player18",
    full_name: "Player 18",
    email: "player18@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "e146f9e4-3b4b-4bf8-bbcb-a9e396296a50",
    participant_code: "player19",
    full_name: "Player 19",
    email: "player19@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "886a5494-343f-4e40-aa12-5bd79ce61658",
    participant_code: "player20",
    full_name: "Player 20",
    email: "player20@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "72eb5845-bb14-4abc-ad69-ff8be0940979",
    participant_code: "player21",
    full_name: "Player 21",
    email: "player21@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "25bf39b8-e24e-477d-9b10-9224187e6b8c",
    participant_code: "player22",
    full_name: "Player 22",
    email: "player22@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "452d44ff-1abc-42d3-9f77-ac853285a2b5",
    participant_code: "player23",
    full_name: "Player 23",
    email: "player23@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "729bf8e2-d1f5-4374-809c-087f94dc7899",
    participant_code: "player24",
    full_name: "Player 24",
    email: "player24@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "832910eb-90fc-4479-8263-83d4a5cdd091",
    participant_code: "player25",
    full_name: "Player 25",
    email: "player25@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "ab75bcd8-dc52-4700-bf7e-ee18a6c67318",
    participant_code: "player26",
    full_name: "Player 26",
    email: "player26@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "d866d8dc-fb7b-43a5-afdb-8c9b532e57ac",
    participant_code: "player27",
    full_name: "Player 27",
    email: "player27@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "a55b6384-6d97-4662-ac7b-208d56d45e10",
    participant_code: "player28",
    full_name: "Player 28",
    email: "player28@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "48773837-b187-4939-8609-ed5ea235fbbe",
    participant_code: "player29",
    full_name: "Player 29",
    email: "player29@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "67ab817f-8f26-489e-b808-34a8afa53b15",
    participant_code: "player30",
    full_name: "Player 30",
    email: "player30@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: false,
  },
  {
    id: "ffaf57cc-298f-4be6-b541-92c00a1bde79",
    participant_code: "DBG2026001",
    full_name: "DBG2026001 (User 1)",
    email: "dbg2026001@debugify.local",
    is_active: true,
    created_at: new Date().toISOString(),
    shortlisted: true,
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
  const norm = code.trim().toLowerCase();
  return getRegisteredParticipants().find((p) => p.participant_code.toLowerCase() === norm);
}
