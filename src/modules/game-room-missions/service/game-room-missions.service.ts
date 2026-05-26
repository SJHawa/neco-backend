import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { GameRoomMissionStepStatus } from '@shared/enums';
import { GameRoomMissionEntity } from '../entity/game-room-mission.entity';
import { GameRoomMissionStepEntity } from '../entity/game-room-mission-step.entity';
import { MissionTemplateEntity } from '../entity/mission-template.entity';
import { MissionTemplateStepEntity } from '../entity/mission-template-step.entity';

export interface CreateGameRoomMissionInput {
  manager: EntityManager;
  gameRoomId: string;
  roomDifficulty: string;
  missionTemplateId: string;
  runtimeContainerId?: string;
}

@Injectable()
export class GameRoomMissionsService {
  async createMissionForGameStart(
    input: CreateGameRoomMissionInput,
  ): Promise<GameRoomMissionEntity> {
    const missionTemplateRepository =
      input.manager.getRepository(MissionTemplateEntity);
    const missionTemplateStepRepository = input.manager.getRepository(
      MissionTemplateStepEntity,
    );
    const gameRoomMissionRepository =
      input.manager.getRepository(GameRoomMissionEntity);
    const gameRoomMissionStepRepository = input.manager.getRepository(
      GameRoomMissionStepEntity,
    );

    await this.ensureNoExistingMission(gameRoomMissionRepository, input.gameRoomId);

    const missionTemplate = await missionTemplateRepository.findOne({
      where: { id: input.missionTemplateId },
    });

    if (!missionTemplate) {
      throw new NotFoundException({
        code: 'MISSION_TEMPLATE_NOT_FOUND',
        message: 'Mission template was not found.',
      });
    }

    if (missionTemplate.difficulty !== input.roomDifficulty) {
      throw new ConflictException({
        code: 'MISSION_TEMPLATE_DIFFICULTY_MISMATCH',
        message: 'Mission template difficulty does not match the room difficulty.',
      });
    }

    const missionTemplateSteps = await missionTemplateStepRepository.find({
      where: { missionTemplateId: missionTemplate.id },
      order: { stepOrder: 'ASC' },
    });

    if (missionTemplateSteps.length === 0) {
      throw new ConflictException({
        code: 'MISSION_TEMPLATE_STEPS_REQUIRED',
        message: 'Mission template must have at least one step.',
      });
    }

    const gameRoomMission = gameRoomMissionRepository.create({
      gameRoomId: input.gameRoomId,
      missionTemplateId: missionTemplate.id,
      currentStepId: null,
      containerId: input.runtimeContainerId ?? null,
      strikeCount: 0,
      judgePolicyJson: missionTemplate.judgePolicyJson,
      projectStructureJson: missionTemplate.projectStructureJson,
      startedAt: new Date(),
      finishedAt: null,
    });

    const savedGameRoomMission = await gameRoomMissionRepository.save(gameRoomMission);
    const gameRoomMissionSteps = missionTemplateSteps.map((missionTemplateStep, index) =>
      gameRoomMissionStepRepository.create({
        gameRoomMissionId: savedGameRoomMission.id,
        missionTemplateStepId: missionTemplateStep.id,
        stepOrder: missionTemplateStep.stepOrder,
        status:
          index === 0
            ? GameRoomMissionStepStatus.READY
            : GameRoomMissionStepStatus.LOCKED,
      }),
    );

    const savedGameRoomMissionSteps =
      await gameRoomMissionStepRepository.save(gameRoomMissionSteps);
    const firstStep = savedGameRoomMissionSteps[0];

    savedGameRoomMission.currentStepId = firstStep.id;

    return gameRoomMissionRepository.save(savedGameRoomMission);
  }

  private async ensureNoExistingMission(
    gameRoomMissionRepository: Repository<GameRoomMissionEntity>,
    gameRoomId: string,
  ): Promise<void> {
    const existingMission = await gameRoomMissionRepository.findOne({
      where: { gameRoomId },
    });

    if (existingMission) {
      throw new ConflictException({
        code: 'GAME_ROOM_MISSION_ALREADY_EXISTS',
        message: 'A mission already exists for this room.',
      });
    }
  }
}
