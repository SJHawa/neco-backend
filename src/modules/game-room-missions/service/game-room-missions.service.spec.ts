/// <reference types="jest" />

import { EntityManager, Repository } from 'typeorm';
import { GameRoomMissionStepStatus } from '@shared/enums';
import { GameRoomMissionEntity } from '../entity/game-room-mission.entity';
import { GameRoomMissionStepEntity } from '../entity/game-room-mission-step.entity';
import { MissionTemplateEntity } from '../entity/mission-template.entity';
import { MissionTemplateStepEntity } from '../entity/mission-template-step.entity';
import { GameRoomMissionsService } from './game-room-missions.service';

describe('GameRoomMissionsService', () => {
  let service: GameRoomMissionsService;
  let missionTemplateRepository: jest.Mocked<
    Pick<Repository<MissionTemplateEntity>, 'findOne'>
  >;
  let missionTemplateStepRepository: jest.Mocked<
    Pick<Repository<MissionTemplateStepEntity>, 'find'>
  >;
  let gameRoomMissionRepository: jest.Mocked<
    Pick<Repository<GameRoomMissionEntity>, 'create' | 'findOne' | 'save'>
  >;
  let gameRoomMissionStepRepository: jest.Mocked<
    Pick<Repository<GameRoomMissionStepEntity>, 'create' | 'save'>
  >;
  let manager: jest.Mocked<Pick<EntityManager, 'getRepository'>>;

  beforeEach(() => {
    missionTemplateRepository = {
      findOne: jest.fn(),
    };
    missionTemplateStepRepository = {
      find: jest.fn(),
    };
    gameRoomMissionRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    gameRoomMissionStepRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === MissionTemplateEntity) {
          return missionTemplateRepository;
        }

        if (entity === MissionTemplateStepEntity) {
          return missionTemplateStepRepository;
        }

        if (entity === GameRoomMissionEntity) {
          return gameRoomMissionRepository;
        }

        return gameRoomMissionStepRepository;
      }),
    } as never;

    service = new GameRoomMissionsService();
  });

  it('creates a room mission with the first step ready and later steps locked', async () => {
    gameRoomMissionRepository.findOne.mockResolvedValue(null);
    missionTemplateRepository.findOne.mockResolvedValue({
      id: 'template-1',
      difficulty: 'EASY',
      dockerImageId: 'docker-image-1',
      judgePolicyJson: { judge: 'strict' },
      projectStructureJson: { files: [{ filePath: 'src/app.ts' }] },
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MissionTemplateEntity);
    missionTemplateStepRepository.find.mockResolvedValue([
      {
        id: 'template-step-1',
        missionTemplateId: 'template-1',
        stepOrder: 1,
      } as MissionTemplateStepEntity,
      {
        id: 'template-step-2',
        missionTemplateId: 'template-1',
        stepOrder: 2,
      } as MissionTemplateStepEntity,
    ]);
    gameRoomMissionRepository.create.mockImplementation((mission) => mission as never);
    gameRoomMissionRepository.save
      .mockResolvedValueOnce({
        id: 'room-mission-1',
        gameRoomId: 'room-1',
        missionTemplateId: 'template-1',
        currentStepId: null,
      } as GameRoomMissionEntity)
      .mockImplementation(async (mission) => mission as never);
    gameRoomMissionStepRepository.create.mockImplementation((step) => step as never);
    gameRoomMissionStepRepository.save.mockResolvedValue([
      {
        id: 'room-mission-step-1',
        gameRoomMissionId: 'room-mission-1',
        missionTemplateStepId: 'template-step-1',
        stepOrder: 1,
        status: GameRoomMissionStepStatus.READY,
      },
      {
        id: 'room-mission-step-2',
        gameRoomMissionId: 'room-mission-1',
        missionTemplateStepId: 'template-step-2',
        stepOrder: 2,
        status: GameRoomMissionStepStatus.LOCKED,
      },
    ] as never);

    const result = await service.createMissionForGameStart({
      manager: manager as unknown as EntityManager,
      gameRoomId: 'room-1',
      roomDifficulty: 'EASY',
      missionTemplateId: 'template-1',
      runtimeContainerId: 'container-1',
    });

    expect(gameRoomMissionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gameRoomId: 'room-1',
        missionTemplateId: 'template-1',
        strikeCount: 0,
        containerId: 'container-1',
        judgePolicyJson: { judge: 'strict' },
        projectStructureJson: { files: [{ filePath: 'src/app.ts' }] },
        currentStepId: null,
        startedAt: expect.any(Date),
      }),
    );
    expect(gameRoomMissionStepRepository.create).toHaveBeenNthCalledWith(1, {
      gameRoomMissionId: 'room-mission-1',
      missionTemplateStepId: 'template-step-1',
      stepOrder: 1,
      status: GameRoomMissionStepStatus.READY,
    });
    expect(gameRoomMissionStepRepository.create).toHaveBeenNthCalledWith(2, {
      gameRoomMissionId: 'room-mission-1',
      missionTemplateStepId: 'template-step-2',
      stepOrder: 2,
      status: GameRoomMissionStepStatus.LOCKED,
    });
    expect(gameRoomMissionRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'room-mission-1',
        currentStepId: 'room-mission-step-1',
      }),
    );
    expect(result.currentStepId).toBe('room-mission-step-1');
  });

  it('rejects game start when the selected template difficulty does not match the room', async () => {
    gameRoomMissionRepository.findOne.mockResolvedValue(null);
    missionTemplateRepository.findOne.mockResolvedValue({
      id: 'template-1',
      difficulty: 'HARD',
      dockerImageId: 'docker-image-1',
      judgePolicyJson: {},
      projectStructureJson: {},
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MissionTemplateEntity);

    await expect(
      service.createMissionForGameStart({
        manager: manager as unknown as EntityManager,
        gameRoomId: 'room-1',
        roomDifficulty: 'EASY',
        missionTemplateId: 'template-1',
        runtimeContainerId: 'container-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MISSION_TEMPLATE_DIFFICULTY_MISMATCH',
      }),
    });
  });

  it('rejects templates without any defined steps', async () => {
    gameRoomMissionRepository.findOne.mockResolvedValue(null);
    missionTemplateRepository.findOne.mockResolvedValue({
      id: 'template-1',
      difficulty: 'EASY',
      dockerImageId: 'docker-image-1',
      judgePolicyJson: {},
      projectStructureJson: {},
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MissionTemplateEntity);
    missionTemplateStepRepository.find.mockResolvedValue([]);

    await expect(
      service.createMissionForGameStart({
        manager: manager as unknown as EntityManager,
        gameRoomId: 'room-1',
        roomDifficulty: 'EASY',
        missionTemplateId: 'template-1',
        runtimeContainerId: 'container-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MISSION_TEMPLATE_STEPS_REQUIRED',
      }),
    });
  });
});
