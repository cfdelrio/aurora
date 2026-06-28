// application-orchestration: the INJECTED collaborators for a composition run. Every side-effecting
// collaborator is passed in explicitly — there are no globals, no service locator, no event bus, no
// scheduler, no implicit repository lookup. The orchestrator depends on the ProviderClientBoundary
// ABSTRACTION (+ config + secret) — never on live transport, the credential resolvers, the process-env
// adapter, or concrete provider internals; fail-closed behavior already lives inside the client and the
// requestRealProviderRendering credential fast-path. Optional collaborators select optional steps.

import type {
  ProviderClientBoundary,
  ProviderClientConfig,
  ProviderSecretRef,
  RenderedMessageRecordRepository,
  ProviderAttemptRecordRepository,
} from "../../rendering/index.ts";
import type { DeliverySink, DeliveryRecordRepository } from "../../delivery/index.ts";
import type { DomainEventRecordRepository } from "../../event-recording/index.ts";

export interface ExplicitOrchestrationDependencies {
  // provider rendering (the abstraction + its operational, non-secret config + injected secret ref)
  readonly client: ProviderClientBoundary;
  readonly config: ProviderClientConfig;
  readonly secret: ProviderSecretRef;
  readonly rendererKind: string; // operational label for the rendered-message record
  readonly providerAdapterKind: string; // operational label for the provider-attempt audit

  // persistence (required for the rendered-message record; optional ones select optional steps)
  readonly renderedMessageRecordRepository: RenderedMessageRecordRepository;
  readonly providerAttemptRepository?: ProviderAttemptRecordRepository; // present ⇒ audit step
  readonly deliverySink?: DeliverySink; // present (with the repo) ⇒ delivery step
  readonly deliveryRecordRepository?: DeliveryRecordRepository;
  readonly eventRepository?: DomainEventRecordRepository; // present (+ recordEvents) ⇒ event step
}
