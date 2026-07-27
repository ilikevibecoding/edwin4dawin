/**
 * The state table.
 *
 * One handler per member of the contract's `AIState` union, keyed by id, so the
 * mapping is exhaustive by construction: adding a state to the contract without
 * writing it will not type-check.
 */
import type { AIState } from '../../core/Contracts';
import type { AIStateHandler } from '../Behavior';
import { AlertState } from './Alert';
import { CombatState } from './Combat';
import { CoverState } from './Cover';
import { DeadState } from './Dead';
import { FlankState } from './Flank';
import { IdleState } from './Idle';
import { PatrolState } from './Patrol';
import { ReloadState } from './Reload';
import { SearchState } from './Search';
import { SuppressedState } from './Suppressed';

export const STATES: Record<AIState, AIStateHandler> = {
  idle: IdleState,
  patrol: PatrolState,
  alert: AlertState,
  search: SearchState,
  combat: CombatState,
  cover: CoverState,
  flank: FlankState,
  reload: ReloadState,
  suppressed: SuppressedState,
  dead: DeadState,
};
