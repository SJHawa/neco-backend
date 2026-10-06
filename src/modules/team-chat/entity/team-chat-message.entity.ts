import { BaseEntity } from '@database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('team_chat_messages')
@Index('idx_team_chat_messages_room_created_at', ['gameRoomId', 'createdAt'])
export class TeamChatMessageEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'game_room_id' })
  gameRoomId!: string;

  @Column({ type: 'uuid', name: 'sender_user_id' })
  senderUserId!: string;

  @Column({ type: 'uuid', name: 'client_message_id', nullable: true })
  clientMessageId!: string | null;

  @Column({ type: 'text' })
  content!: string;
}
