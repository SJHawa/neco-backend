import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedRequestGuard } from '@common/guards/authenticated-request.guard';
import { CurrentUserId } from '@common/decorators/current-user-id.decorator';
import { ListRankingsQueryDto } from './dto/list-rankings-query.dto';
import { RegisterTeamRankingDto } from './dto/register-team-ranking.dto';
import { RankingsService } from './rankings.service';

@Controller('rankings')
@UseGuards(AuthenticatedRequestGuard)
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('individual')
  listIndividualRankings(@Query() query: ListRankingsQueryDto) {
    return this.rankingsService.listIndividualRankings(query.limit);
  }

  @Get('teams')
  listTeamRankings(@Query() query: ListRankingsQueryDto) {
    return this.rankingsService.listTeamRankings(query.limit);
  }

  @Get('game-rooms/:gameRoomId/contributions')
  getGameContributions(
    @Param('gameRoomId') gameRoomId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.rankingsService.getGameContributions(gameRoomId, userId);
  }

  @Post('game-rooms/:gameRoomId/register')
  registerTeamRanking(
    @Param('gameRoomId') gameRoomId: string,
    @Body() body: RegisterTeamRankingDto,
    @CurrentUserId() userId: string,
  ) {
    return this.rankingsService.registerTeamRanking(gameRoomId, userId, body.teamName);
  }
}
