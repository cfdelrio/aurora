// event-recording domain: who/what produced an occurrence, where applicable. Explicit and narrow —
// NOT an open metadata bag. It carries a reference handle, never a copied actor object.

export type EventActor =
  | { readonly kind: "athlete"; readonly athleteRef: string }
  | { readonly kind: "coach"; readonly coachRef: string }
  | { readonly kind: "system" };

export function eventActor(input: EventActor): EventActor {
  if (input === null || typeof input !== "object") {
    throw new Error("EventActor requires a kind");
  }
  switch (input.kind) {
    case "athlete":
      if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
        throw new Error("EventActor(athlete) requires a non-empty athleteRef");
      }
      return Object.freeze({ kind: "athlete", athleteRef: input.athleteRef });
    case "coach":
      if (typeof input.coachRef !== "string" || input.coachRef.length === 0) {
        throw new Error("EventActor(coach) requires a non-empty coachRef");
      }
      return Object.freeze({ kind: "coach", coachRef: input.coachRef });
    case "system":
      return Object.freeze({ kind: "system" });
    default:
      throw new Error(`EventActor.kind must be athlete | coach | system, got: ${String((input as { kind: unknown }).kind)}`);
  }
}
