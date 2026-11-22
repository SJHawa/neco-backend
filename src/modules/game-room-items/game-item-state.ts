import { EntityManager } from 'typeorm';
import { GameItemType } from '@shared/enums';
import { GameRoomItemEntity } from './entity/game-room-item.entity';

export interface GameItemState {
  itemType: GameItemType;
  remainingQuantity: number;
  activeCount: number;
  unlocked: boolean;
  unlockReason: string | null;
}

// The caller supplies the transaction that also reads the turn deadline.
// Missing inventory is a legacy/waiting room, never a reason to allocate.
export async function loadGameItemState(
  manager: EntityManager,
  gameRoomId: string,
): Promise<GameItemState[]> {
  const repository = manager.getRepository(GameRoomItemEntity);
  // Some transaction adapters expose only point reads. Keeping this fallback
  // also lets legacy runtime/test adapters participate without allocating stock.
  const items = typeof repository.find === 'function'
    ? await repository.find({ where: { gameRoomId } })
    : (await Promise.all(
      Object.values(GameItemType).map((itemType) => repository.findOne({
        where: { gameRoomId, itemType },
      })),
    )).filter((item): item is GameRoomItemEntity => Boolean(item));
  const byType = new Map(items.map((item) => [item.itemType, item]));

  return Object.values(GameItemType).map((itemType) => {
    const item = byType.get(itemType);
    return {
      itemType,
      remainingQuantity: item?.quantity ?? 0,
      activeCount: item?.activeCount ?? 0,
      unlocked: Boolean(item?.unlockedAt),
      unlockReason: item?.unlockReason ?? null,
    };
  });
}
