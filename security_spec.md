# Security Specification — Sút Phạt 3D Online

## 1. Data Invariants
- `/usernames/{usernameKey}` can only be claimed once by an authenticated user whose `request.auth.uid == incoming().uid`, and `usernameKey` must match `^[a-z0-9_]{3,24}$`. No `list` queries or updates/deletes are allowed.
- `/users/{userId}` can only be read (`get`), created, or updated by the authenticated owner (`request.auth.uid == userId`), or adjusted/kicked by the verified Admin (`bot522409@gmail.com`) via strictly scoped fields (`coins`/`updatedAt` or `kickedAt`/`kickReason`/`updatedAt`). No `delete` operations are allowed, preventing data destruction.
- `/leaderboard/{userId}` contains strictly non-PII public game statistics (`isPublic: true`, `squadOvr <= 200`, `topCardOvr <= 200`) and can only be written by `request.auth.uid == userId`.
- `/transfer_listings/{listingId}` enforces escrowed card listing invariants: only signed-in users may read/create (`sellerUid == auth.uid`, `status == 'active'`, `payoutClaimed == false`), sellers may only cancel their own active listings or claim payouts on sold listings, buyers (`buyerUid == auth.uid`, `buyerUid != sellerUid`) may only purchase active listings, and card/price/seller fields are immutable after creation (price >= 100 with no artificial upper limit; user coins >= 0 with no artificial upper limit).
- `/inbox_messages/{messageId}` allows signed-in users to send immutable global or DM messages (`senderUid == request.auth.uid`, `createdAt == request.time`, text length 1..500), and only allows reading global messages or DMs where `request.auth.uid in resource.data.participants`.
- `/online_presence/{userId}` allows each signed-in user to publish/update/delete only their own live status (`uid == request.auth.uid`, `updatedAt == request.time`) and allows signed-in players to query active online players (`online == true`).
- All string fields enforce explicit `.size()` bounds; all list fields enforce `.size()` bounds; `createdAt` is immutable and strictly validated with `request.time`; `updatedAt` is strictly validated with `request.time`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read/write to `/users/userA` or `/transfer_listings/listA`.
2. Authenticated `userB` attempting `get` or `update` on `/users/userA` or buying their own listing.
3. `list` query on `/users` (by non-admin) or `/usernames` to scrape accounts.
4. Creating `/users/userA` with spoofed `uid: "userB"`.
5. Creating `/users/userA` with a ghost shadow field `{ ..., isAdmin: true }`.
6. Updating `/users/userA` with `createdAt` modified or forged `updatedAt` != `request.time`.
7. Updating `/users/userA` with oversized `ownedIds` (> 250 items) or invalid `lineupIds.size() != 5`.
8. Updating `/users/userA` with negative `coins: -500` or `squadOvr: 999`.
9. Non-admin attempting to update `kickedAt` / `kickReason` on `/users/userA`.
10. Overwriting an already-claimed `/usernames/ronaldo7` document (`update` or `delete`).
11. Creating `/leaderboard/userA` as `userB` or setting `isPublic: false`.
12. Modifying immutable `price`, `cardId`, or `sellerUid` on an active `/transfer_listings/{id}` or claiming payout twice.
